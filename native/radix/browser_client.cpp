// @spec SPEC-ORBIS-TELA-CEF
#include "radix/browser_client.hpp"
#include "include/cef_app.h"
#include "include/cef_parser.h"
#include "include/wrapper/cef_helpers.h"

namespace orbis {
BrowserClient::BrowserClient(std::function<void(const std::string&)> changed,
    std::function<void()> closed)
    : address_changed_(std::move(changed)), closed_(std::move(closed)) {}
bool BrowserClient::allowed_url(const std::string& url) {
    if(url=="about:blank") return true;
    CefURLParts parts;
    if(!CefParseURL(url,parts)) return false;
    const auto scheme=CefString(&parts.scheme).ToString();
    return (scheme=="http" || scheme=="https") && parts.host.length>0;
}
void BrowserClient::OnAfterCreated(CefRefPtr<CefBrowser> browser) {
    CEF_REQUIRE_UI_THREAD(); browser_=browser;
}
void BrowserClient::detach() {
    CEF_REQUIRE_UI_THREAD();
    address_changed_={};
    closed_=[]{CefQuitMessageLoop();};
}
void BrowserClient::OnBeforeClose(CefRefPtr<CefBrowser>) {
    CEF_REQUIRE_UI_THREAD();
    browser_=nullptr; address_changed_={};
    // The application decides when all views are closed; one view must not
    // shut down a shared CEF runtime used by Orbis, Tela or another consumer.
    auto closed=std::move(closed_);
    if(closed) closed();
}
bool BrowserClient::OnBeforeBrowse(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>,
    CefRefPtr<CefRequest> request, bool, bool) {
    CEF_REQUIRE_UI_THREAD(); return !allowed_url(request->GetURL());
}
bool BrowserClient::OnBeforePopup(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>, int,
    const CefString&, const CefString&, CefLifeSpanHandler::WindowOpenDisposition, bool,
    const CefPopupFeatures&, CefWindowInfo&, CefRefPtr<CefClient>&,
    CefBrowserSettings&, CefRefPtr<CefDictionaryValue>&, bool*) {
    return true;
}
bool BrowserClient::OnOpenURLFromTab(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame>,
    const CefString&, CefRequestHandler::WindowOpenDisposition, bool) {
    // Disposition-driven navigations bypass OnBeforePopup; refusing them keeps
    // external protocols and unmanaged windows out of the host.
    CEF_REQUIRE_UI_THREAD(); return true;
}
void BrowserClient::OnAddressChange(CefRefPtr<CefBrowser>, CefRefPtr<CefFrame> frame,
    const CefString& url) {
    CEF_REQUIRE_UI_THREAD();
    if(frame->IsMain() && address_changed_) address_changed_(url.ToString());
}
}
