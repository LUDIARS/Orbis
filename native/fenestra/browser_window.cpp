// @spec SPEC-ORBIS-TELA-CEF
#include "fenestra/browser_window.hpp"
#include "include/cef_app.h"
#include <windowsx.h>
#include <algorithm>
#include <cmath>
#include <stdexcept>

namespace orbis {
BrowserWindow::BrowserWindow(const std::string& font,std::function<void()> closed)
    : closed_(std::move(closed)), painter_(font) {
    tela::Theme theme; theme.panel.a=255; theme.button.a=255; theme.pressed.a=255;
    runtime_.theme(theme);
}
BrowserWindow::~BrowserWindow() {
    // The client outlives this window: CEF holds a reference until the browser
    // has finished closing. Drop the callbacks that captured `this` first so a
    // late OnAddressChange cannot reach a destroyed window.
    if(client_) client_->detach();
    // Drain asynchronous destruction if open() failed after browser creation.
    // CefShutdown must never run with a live browser reference. detach() made
    // OnBeforeClose quit the loop, so this drain always terminates.
    if(client_ && client_->browser()) {
        client_->browser()->GetHost()->CloseBrowser(true);
        CefRunMessageLoop();
    }
    if(IsWindow(window_)) DestroyWindow(window_);
}
void BrowserWindow::open(HINSTANCE instance,const std::string& url) {
    if(!BrowserClient::allowed_url(url)) throw std::invalid_argument("Unsupported initial URL");
    WNDCLASSW type{}; type.lpfnWndProc=procedure; type.hInstance=instance;
    type.lpszClassName=L"Orbis.TelaBrowser"; type.hCursor=LoadCursor(nullptr,IDC_ARROW);
    if(!RegisterClassW(&type) && GetLastError()!=ERROR_CLASS_ALREADY_EXISTS)
        throw std::runtime_error("Cannot register Orbis window");
    window_=CreateWindowExW(0,type.lpszClassName,L"Orbis",WS_OVERLAPPEDWINDOW|WS_CLIPCHILDREN,
        CW_USEDEFAULT,CW_USEDEFAULT,1100,760,nullptr,nullptr,instance,this);
    if(!window_) throw std::runtime_error("Cannot create Orbis window");
    refresh(url);
    client_=new BrowserClient([this](const std::string& address){refresh(address);},closed_);
    RECT bounds{}; GetClientRect(window_,&bounds);
    CefWindowInfo info;
    info.SetAsChild(window_,CefRect(0,toolbar_pixels_,bounds.right,
        std::max(1L,bounds.bottom-toolbar_pixels_)));
    info.runtime_style=CEF_RUNTIME_STYLE_ALLOY;
    CefBrowserSettings settings;
    if(!CefBrowserHost::CreateBrowserSync(info,client_,url,settings,nullptr,nullptr))
        throw std::runtime_error("Cannot create CEF WebView");
    // The first show may consume the launcher's hidden startup preference.
    ShowWindow(window_,SW_SHOWDEFAULT); ShowWindow(window_,SW_SHOWNORMAL);
    resize();
}
void BrowserWindow::refresh(const std::string& address) {
    runtime_.document(toolbar(address,[this](BrowserAction action){dispatch(action);}));
    if(window_) InvalidateRect(window_,nullptr,FALSE);
}
void BrowserWindow::dispatch(BrowserAction action) {
    const auto browser=client_?client_->browser():nullptr;
    if(!browser) return;
    switch(action) {
    case BrowserAction::back: if(browser->CanGoBack()) browser->GoBack(); break;
    case BrowserAction::forward: if(browser->CanGoForward()) browser->GoForward(); break;
    case BrowserAction::reload: browser->Reload(); break;
    }
}
void BrowserWindow::resize() {
    RECT bounds{}; GetClientRect(window_,&bounds);
    POINT origin{}; ClientToScreen(window_,&origin);
    const float scale=GetDpiForWindow(window_)/96.f;
    toolbar_pixels_=std::min(static_cast<int>(bounds.bottom),static_cast<int>(std::ceil(toolbar_height*scale)));
    auto view=runtime_.viewport(); ++view.revision;
    view.host_id="orbis"; view.view_id="navigation";
    view.width=bounds.right; view.height=toolbar_pixels_; view.dpi_scale=scale;
    view.desktop_x=origin.x; view.desktop_y=origin.y;
    view.visible=IsWindowVisible(window_) && !IsIconic(window_);
    view.focused=GetForegroundWindow()==window_;
    runtime_.viewport(view);
    const auto browser=client_?client_->browser():nullptr;
    if(browser) {
        const auto child=browser->GetHost()->GetWindowHandle();
        SetWindowPos(child,nullptr,0,toolbar_pixels_,bounds.right,
            std::max(0L,bounds.bottom-toolbar_pixels_),SWP_NOZORDER|SWP_NOACTIVATE);
    }
    if(runtime_.needs_frame()) InvalidateRect(window_,nullptr,FALSE);
}
void BrowserWindow::paint() {
    // Render before BeginPaint: if allocation fails, the Win32 paint DC is not leaked.
    if(runtime_.needs_frame()) { pixels_=painter_.render(runtime_); runtime_.frame_presented(); }
    PAINTSTRUCT paint{}; const auto dc=BeginPaint(window_,&paint);
    if(!pixels_.pixels.empty()) {
        BITMAPINFO bitmap{}; bitmap.bmiHeader.biSize=sizeof(BITMAPINFOHEADER);
        bitmap.bmiHeader.biWidth=pixels_.width; bitmap.bmiHeader.biHeight=-pixels_.height;
        bitmap.bmiHeader.biPlanes=1; bitmap.bmiHeader.biBitCount=32;
        StretchDIBits(dc,0,0,pixels_.width,pixels_.height,0,0,pixels_.width,pixels_.height,
            pixels_.pixels.data(),&bitmap,DIB_RGB_COLORS,SRCCOPY);
    }
    EndPaint(window_,&paint);
}
void BrowserWindow::pointer(UINT kind,LPARAM location) {
    POINT point{GET_X_LPARAM(location),GET_Y_LPARAM(location)}; ClientToScreen(window_,&point);
    tela::HostPointerEvent event; event.sequence=++sequence_;
    event.viewport_revision=runtime_.viewport().revision;
    event.phase=kind==WM_LBUTTONDOWN?tela::PointerPhase::down:
        kind==WM_LBUTTONUP?tela::PointerPhase::up:tela::PointerPhase::move;
    if(kind==WM_LBUTTONDOWN) { ++gesture_; SetFocus(window_); }
    event.gesture_id=gesture_; event.button=tela::PointerButton::primary;
    event.desktop_x=point.x; event.desktop_y=point.y;
    const bool consumed=runtime_.pointer(event,tela::InputSource::native);
    if(kind==WM_LBUTTONDOWN && consumed) SetCapture(window_);
    if(kind==WM_LBUTTONUP && GetCapture()==window_) ReleaseCapture();
    if(runtime_.needs_frame()) InvalidateRect(window_,nullptr,FALSE);
}
LRESULT CALLBACK BrowserWindow::procedure(HWND window,UINT kind,WPARAM wp,LPARAM lp) {
    auto self=reinterpret_cast<BrowserWindow*>(GetWindowLongPtrW(window,GWLP_USERDATA));
    if(kind==WM_NCCREATE) {
        self=static_cast<BrowserWindow*>(reinterpret_cast<CREATESTRUCTW*>(lp)->lpCreateParams);
        self->window_=window; SetWindowLongPtrW(window,GWLP_USERDATA,reinterpret_cast<LONG_PTR>(self));
    }
    if(!self) return DefWindowProcW(window,kind,wp,lp);
    try { return self->message(kind,wp,lp); }
    catch(const std::exception& error) {
        OutputDebugStringA(error.what());
        if(kind==WM_PAINT) ValidateRect(window,nullptr);
        PostMessageW(window,WM_CLOSE,0,0); return 0;
    }
}
LRESULT BrowserWindow::message(UINT kind,WPARAM wp,LPARAM lp) {
    switch(kind) {
    case WM_SIZE: case WM_MOVE: case WM_SHOWWINDOW: case WM_ACTIVATE:
        resize(); break;
    case WM_DPICHANGED: {
        const auto rect=reinterpret_cast<RECT*>(lp);
        SetWindowPos(window_,nullptr,rect->left,rect->top,rect->right-rect->left,
            rect->bottom-rect->top,SWP_NOZORDER|SWP_NOACTIVATE); return 0;
    }
    case WM_PAINT: paint(); return 0;
    case WM_ERASEBKGND: return 1;
    case WM_LBUTTONDOWN: case WM_LBUTTONUP: case WM_MOUSEMOVE: pointer(kind,lp); return 0;
    case WM_CAPTURECHANGED: case WM_CANCELMODE:
        runtime_.cancel(); InvalidateRect(window_,nullptr,FALSE); return 0;
    case WM_CLOSE: {
        const auto browser=client_?client_->browser():nullptr;
        if(browser && !browser->GetHost()->TryCloseBrowser()) return 0;
        DestroyWindow(window_); return 0;
    }
    }
    return DefWindowProcW(window_,kind,wp,lp);
}
}
