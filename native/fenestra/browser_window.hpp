#pragma once
#include "radix/browser_client.hpp"
#include "fenestra/toolbar.hpp"
#include <tela/pictor_surface.hpp>
#include <windows.h>

namespace orbis {
// @implements SPEC-ORBIS-TELA-CEF
// Owns the native frame. CEF exclusively owns input inside its child HWND.
class BrowserWindow final {
public:
    BrowserWindow(const std::string& font,std::function<void()> closed);
    ~BrowserWindow();
    BrowserWindow(const BrowserWindow&)=delete;
    BrowserWindow& operator=(const BrowserWindow&)=delete;
    void open(HINSTANCE instance, const std::string& url);
private:
    static LRESULT CALLBACK procedure(HWND,UINT,WPARAM,LPARAM);
    LRESULT message(UINT,WPARAM,LPARAM);
    void resize();
    void paint();
    void pointer(UINT,LPARAM);
    void refresh(const std::string& address);
    void dispatch(BrowserAction);
    HWND window_{};
    CefRefPtr<BrowserClient> client_;
    std::function<void()> closed_;
    tela::Runtime runtime_;
    tela::PictorSurface painter_;
    tela::PixelSurface pixels_;
    std::uint64_t sequence_{},gesture_{};
    int toolbar_pixels_{48};
};
}
