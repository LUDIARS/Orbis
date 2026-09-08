#pragma once
#include <tela/document.hpp>
#include <functional>

namespace orbis {
enum class BrowserAction { back, forward, reload };
inline constexpr float toolbar_height=48;
// @implements SPEC-ORBIS-TELA-CEF
tela::Document toolbar(const std::string& address,
                       const std::function<void(BrowserAction)>& dispatch);
}
