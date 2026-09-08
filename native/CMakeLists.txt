cmake_minimum_required(VERSION 3.24)
project(OrbisNative VERSION 0.1.0 LANGUAGES CXX)
if(NOT WIN32 OR NOT CMAKE_SIZEOF_VOID_P EQUAL 8)
  message(FATAL_ERROR "The initial Orbis CEF host requires Windows x64")
endif()
set(CEF_ROOT "" CACHE PATH "Extracted CEF 152.0.6 Windows x64 SDK")
if(NOT EXISTS "${CEF_ROOT}/include/cef_app.h")
  message(FATAL_ERROR "Set CEF_ROOT to the explicitly provisioned SDK")
endif()
file(READ "${CEF_ROOT}/include/cef_version.h" cef_version)
if(NOT cef_version MATCHES "152.0.6\\+g708dc14\\+chromium-152.0.7977.83")
  message(FATAL_ERROR "CEF SDK differs from native/cef-sdk.json")
endif()
set(CEF_RUNTIME_LIBRARY_FLAG "/MD" CACHE STRING "CEF wrapper CRT" FORCE)
set(USE_SANDBOX ON CACHE BOOL "Use the CEF sandbox bootstrap" FORCE)
list(APPEND CMAKE_MODULE_PATH "${CEF_ROOT}/cmake")
find_package(CEF REQUIRED)
# SDK 19041 does not name the FE target yet. Preserve CEF's target version
# numerically so the Windows headers do not evaluate the unknown name as zero.
list(TRANSFORM CEF_COMPILER_DEFINES REPLACE "^NTDDI_VERSION=NTDDI_WIN10_FE$" "NTDDI_VERSION=0x0A00000A")
add_subdirectory("${CEF_LIBCEF_DLL_WRAPPER_PATH}" cef-wrapper)
find_package(Tela CONFIG REQUIRED)
if(NOT TARGET Tela::Pictor)
  message(FATAL_ERROR "Install Tela with its Pictor adapter enabled")
endif()
add_library(orbis_webview STATIC radix/browser_client.cpp)
add_library(Orbis::WebView ALIAS orbis_webview)
target_compile_features(orbis_webview PUBLIC cxx_std_20)
target_compile_options(orbis_webview PRIVATE /EHsc /utf-8)
target_include_directories(orbis_webview SYSTEM PUBLIC "${CEF_ROOT}")
target_include_directories(orbis_webview PUBLIC "${CMAKE_CURRENT_SOURCE_DIR}")
target_compile_definitions(orbis_webview PUBLIC CEF_API_VERSION=CEF_API_VERSION_LAST
  UNICODE _UNICODE NOMINMAX _WIN32_WINNT=0x0A00)
target_link_libraries(orbis_webview PUBLIC libcef_dll_wrapper "${CEF_LIB_RELEASE}")
add_library(orbis_native SHARED radix/entry.cpp
  fenestra/browser_window.cpp fenestra/toolbar.cpp)
target_compile_features(orbis_native PRIVATE cxx_std_20)
target_include_directories(orbis_native SYSTEM PRIVATE "${CEF_ROOT}")
target_include_directories(orbis_native PRIVATE "${CMAKE_CURRENT_SOURCE_DIR}")
target_compile_definitions(orbis_native PRIVATE UNICODE _UNICODE NOMINMAX
  _WIN32_WINNT=0x0A00 CEF_USE_BOOTSTRAP CEF_API_VERSION=CEF_API_VERSION_LAST)
target_compile_options(orbis_native PRIVATE /W4 /EHsc /utf-8)
target_link_options(orbis_native PRIVATE ${CEF_SHARED_LINKER_FLAGS})
target_link_libraries(orbis_native PRIVATE Tela::Pictor Orbis::WebView
  ${CEF_STANDARD_LIBS} user32)
add_custom_command(TARGET orbis_native POST_BUILD
  COMMAND ${CMAKE_COMMAND} -E copy_directory "${CEF_ROOT}/Release" "$<TARGET_FILE_DIR:orbis_native>"
  COMMAND ${CMAKE_COMMAND} -E copy_directory "${CEF_ROOT}/Resources" "$<TARGET_FILE_DIR:orbis_native>"
  COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CEF_ROOT}/Release/bootstrap.exe" "$<TARGET_FILE_DIR:orbis_native>/orbis_native.exe"
  COMMAND ${CMAKE_COMMAND} -E copy_if_different "${CEF_ROOT}/LICENSE.txt" "$<TARGET_FILE_DIR:orbis_native>/CEF-LICENSE.txt")
