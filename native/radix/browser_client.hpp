#pragma once
#include "include/cef_client.h"
#include <functional>

namespace orbis {
// @implements SPEC-ORBIS-TELA-CEF
// UI-thread owner of one CEF view; it cannot create unmanaged popup windows.
class BrowserClient final : public CefClient, public CefLifeSpanHandler,
                            public CefRequestHandler, public CefDisplayHandler {
public:
    BrowserClient(std::function<void(const std::string&)> address_changed,
                  std::function<void()> closed);
    CefRefPtr<CefLifeSpanHandler> GetLifeSpanHandler() override { return this; }
    CefRefPtr<CefRequestHandler> GetRequestHandler() override { return this; }
    CefRefPtr<CefDisplayHandler> GetDisplayHandler() override { return this; }
    void OnAfterCreated(CefRefPtr<CefBrowser> browser) override;
    void OnBeforeClose(CefRefPtr<CefBrowser> browser) override;
    bool OnBeforeBrowse(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>,
                        CefRefPtr<CefRequest>, bool, bool) override;
    bool OnBeforePopup(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>, int,
        const CefString&, const CefString&, CefLifeSpanHandler::WindowOpenDisposition, bool,
        const CefPopupFeatures&, CefWindowInfo&, CefRefPtr<CefClient>&,
        CefBrowserSettings&, CefRefPtr<CefDictionaryValue>&, bool*) override;
    bool OnOpenURLFromTab(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>, const CefString&,
                          CefRequestHandler::WindowOpenDisposition, bool) override;
    void OnAddressChange(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>, const CefString&) override;
    CefRefPtr<CefBrowser> browser() const { return browser_; }
    // Release the host-owned callbacks before the host is destroyed. CEF keeps
    // this client alive past that point, so OnBeforeClose falls back to quitting
    // the message loop the caller is draining.
    void detach();
    static bool allowed_url(const std::string& url);
private:
    CefRefPtr<CefBrowser> browser_;
    std::function<void(const std::string&)> address_changed_;
    std::function<void()> closed_;
    IMPLEMENT_REFCOUNTING(BrowserClient);
};
}
