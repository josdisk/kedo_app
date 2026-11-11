cmake_minimum_required(VERSION 3.24)
if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
  project(kedo_smart_v_native VERSION 0.1.0 LANGUAGES CXX)
endif()

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(KEDOV_BUILD_TESTS "Build CTest unit tests" ON)
option(KEDOV_ENABLE_FFMPEG "Link libav FFmpeg probe (license-gated)" OFF)
option(KEDOV_ENABLE_QT "Build Qt6 desktop shell (LGPL-dev local; not ship-approved)" OFF)

add_library(kedov_media_core
  media-core/src/rational_time.cpp
  media-core/src/media_source_ref.cpp
  media-core/src/probe_result.cpp
  media-core/src/sha256.cpp
)
target_include_directories(kedov_media_core
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/media-core/include
)
target_compile_features(kedov_media_core PUBLIC cxx_std_20)

option(KEDOV_ENABLE_OCIO "Link OpenColorIO (license-gated)" OFF)

add_library(kedov_media_color
  media-color/src/grade.cpp
  media-color/src/ocio_config.cpp
)
target_include_directories(kedov_media_color
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/media-color/include
)
target_link_libraries(kedov_media_color PUBLIC kedov_media_core)
target_compile_definitions(kedov_media_color
  PUBLIC
    KEDOV_OCIO_CONFIG_PATH="${CMAKE_CURRENT_SOURCE_DIR}/media-color/ocio/kedov_aces_lite.json"
)
if(KEDOV_ENABLE_OCIO)
  find_package(OpenColorIO REQUIRED)
  target_compile_definitions(kedov_media_color PUBLIC KEDOV_HAS_OCIO=1)
  target_link_libraries(kedov_media_color PUBLIC OpenColorIO::OpenColorIO)
endif()

add_library(kedov_media_timeline
  media-timeline/src/clip_instance.cpp
  media-timeline/src/sequence.cpp
  media-timeline/src/edit_operation.cpp
  media-timeline/src/plan_apply.cpp
)
target_include_directories(kedov_media_timeline
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/media-timeline/include
)
target_link_libraries(kedov_media_timeline PUBLIC kedov_media_core kedov_media_color)

add_library(kedov_media_io
  media-io/src/probe_stub.cpp
  media-io/src/ffprobe_probe.cpp
  media-io/src/folder_scan.cpp
  media-io/src/frame_extract.cpp
  media-io/src/proxy_job.cpp
)
target_include_directories(kedov_media_io
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/media-io/include
)
target_link_libraries(kedov_media_io PUBLIC kedov_media_core)
if(KEDOV_ENABLE_FFMPEG)
  find_package(PkgConfig REQUIRED)
  pkg_check_modules(FFMPEG REQUIRED libavformat libavcodec libavutil)
  target_sources(kedov_media_io PRIVATE media-io/src/ffmpeg_probe.cpp)
  target_compile_definitions(kedov_media_io PUBLIC KEDOV_HAS_FFMPEG=1)
  target_include_directories(kedov_media_io PRIVATE ${FFMPEG_INCLUDE_DIRS})
  target_link_libraries(kedov_media_io PRIVATE ${FFMPEG_LIBRARIES})
endif()

add_library(kedov_media_audio
  media-audio/src/sync_correlate.cpp
  media-audio/src/wav_reader.cpp
  media-audio/src/sync_session.cpp
  media-audio/src/drift_map.cpp
  media-audio/src/fingerprint.cpp
)
target_include_directories(kedov_media_audio
  PUBLIC
    ${CMAKE_CURRENT_SOURCE_DIR}/media-audio/include
)
target_link_libraries(kedov_media_audio PUBLIC kedov_media_core)

add_executable(kedov_probe_cli apps/probe_cli.cpp)
target_link_libraries(kedov_probe_cli PRIVATE kedov_media_io kedov_media_core)

add_executable(kedov_ingest_cli apps/ingest_cli.cpp)
target_link_libraries(kedov_ingest_cli PRIVATE kedov_media_io kedov_media_core)

add_executable(kedov_sync_cli apps/sync_cli.cpp)
target_link_libraries(kedov_sync_cli PRIVATE kedov_media_audio kedov_media_core)

if(KEDOV_ENABLE_QT)
  # Qt UI lives in apps/desktop — never import Qt into portable native libs.
  add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/../apps/desktop" kedov_desktop_build)
endif()

if(KEDOV_BUILD_TESTS)
  enable_testing()
  add_executable(kedov_core_tests
    tests/test_rational_time.cpp
    tests/test_timeline.cpp
    tests/test_audio_sync.cpp
    tests/test_ingest.cpp
    tests/test_sync_session.cpp
    tests/test_color_grade.cpp
    tests/test_plan_apply.cpp
    tests/test_proxy_encode.cpp
    tests/test_preview_scrub.cpp
    tests/test_drift_map.cpp
    tests/test_fingerprint.cpp
    tests/test_ocio_config.cpp
  )
  target_link_libraries(kedov_core_tests
    PRIVATE
      kedov_media_core
      kedov_media_timeline
      kedov_media_audio
      kedov_media_io
      kedov_media_color
  )
  target_compile_definitions(kedov_core_tests
    PRIVATE
      KEDOV_NATIVE_SOURCE_DIR="${CMAKE_CURRENT_SOURCE_DIR}"
      KEDOV_OCIO_CONFIG_PATH="${CMAKE_CURRENT_SOURCE_DIR}/media-color/ocio/kedov_aces_lite.json"
  )
  add_test(NAME kedov_core_tests COMMAND kedov_core_tests)
endif()
