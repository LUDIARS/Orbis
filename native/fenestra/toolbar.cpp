// @spec SPEC-ORBIS-TELA-CEF
#include "fenestra/toolbar.hpp"
namespace orbis {
tela::Document toolbar(const std::string& address,
                      const std::function<void(BrowserAction)>& dispatch) {
    tela::Document result;
    tela::Layout row; row.height=toolbar_height; row.padding=4; row.flow=tela::Flow::row;
    result.panel("browser.navigation",[&] {
        tela::Layout button; button.width=76; button.height=40; button.padding=8;
        result.button("browser.back","Back",[dispatch]{dispatch(BrowserAction::back);},button);
        result.button("browser.forward","Forward",[dispatch]{dispatch(BrowserAction::forward);},button);
        result.button("browser.reload","Reload",[dispatch]{dispatch(BrowserAction::reload);},button);
        tela::Layout label; label.height=40;
        result.text("browser.address",address,label);
    },row);
    return result;
}
}
