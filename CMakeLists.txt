cmake_minimum_required(VERSION 3.24)
project(kedo_smart_v LANGUAGES CXX)
# Prefer configuring from native/ (see native/CMakePresets.json).
# Root entry exists so `cmake -S .` from the monorepo root still works.
add_subdirectory(native)
