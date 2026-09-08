// @spec SPEC-ORBIS-TELA-CEF
#include "fenestra/browser_window.hpp"
#include "include/cef_app.h"
#include "include/cef_command_line.h"
#include "include/cef_sandbox_win.h"
#include <filesystem>
#include <stdexcept>

// @implements SPEC-ORBIS-TELA-CEF
// CEF's provided bootstrap owns sandbox initialization before this DLL is loaded.
extern "C" __declspec(dllexport) int RunWinMain(HINSTANCE instance,LPWSTR,int,
    void* sandbox_info,cef_version_info_t*) {
    CefMainArgs args(instance);
    const int subprocess=CefExecuteProcess(args,nullptr,sandbox_info);
    if(subprocess>=0) return subprocess;
    bool initialized=false;
    try {
        if(!sandbox_info) throw std::runtime_error("CEF sandbox bootstrap is required");
        auto command=CefCommandLine::CreateCommandLine();
        command->InitFromString(GetCommandLineW());
        if(command->HasSwitch("no-sandbox")) throw std::runtime_error("Sandbox cannot be disabled");
        const auto font=command->GetSwitchValue("font").ToString();
        const auto font_path=command->GetSwitchValue("font").ToWString();
        const auto profile=command->GetSwitchValue("profile").ToWString();
        // Use the wide form: std::filesystem::u8path is deprecated in C++20 and
        // the native Windows encoding needs no conversion.
        if(font.empty() || !std::filesystem::is_regular_file(std::filesystem::path(font_path)))
            throw std::runtime_error("--font must name a TrueType font file");
        if(profile.empty() || !std::filesystem::path(profile).is_absolute())
            throw std::runtime_error("--profile must name an absolute, dedicated CEF profile directory");
        SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        CefSettings settings;
        CefString(&settings.root_cache_path)=profile;
        CefString(&settings.cache_path)=profile;
        if(!CefInitialize(args,settings,nullptr,sandbox_info)) return CefGetExitCode();
        initialized=true;
        {
            orbis::BrowserWindow window(font,[]{CefQuitMessageLoop();});
            const auto url=command->HasSwitch("url")?command->GetSwitchValue("url").ToString():"about:blank";
            window.open(instance,url);
            CefRunMessageLoop();
        }
        CefShutdown(); return 0;
    } catch(const std::exception& error) {
        OutputDebugStringA(error.what());
        if(initialized) CefShutdown();
        return 1;
    }
}
