import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    width: 44
    color: T.panel
    border.color: T.lineSoft

    ColumnLayout {
        anchors.fill: parent
        anchors.topMargin: 10
        anchors.bottomMargin: 10
        spacing: 4

        Repeater {
            model: [
                { id: "select", glyph: "select", tip: "Selection (V)" },
                { id: "razor", glyph: "razor", tip: "Razor (C) — click again to cut" },
                { id: "ripple", glyph: "ripple", tip: "Ripple edit" },
                { id: "pen", glyph: "pen", tip: "Pen" },
                { id: "type", glyph: "type", tip: "Type" },
                { id: "hand", glyph: "hand", tip: "Hand" },
                { id: "snap", glyph: "snap", tip: "Toggle snap" }
            ]
            delegate: ToolButtonChrome {
                Layout.alignment: Qt.AlignHCenter
                glyph: modelData.glyph
                tip: modelData.tip
                active: modelData.id === "snap" ? nativeBridge.snapEnabled : nativeBridge.tool === modelData.id
                onClicked: {
                    if (modelData.id === "snap") {
                        nativeBridge.setSnapEnabled(!nativeBridge.snapEnabled)
                    } else if (modelData.id === "razor" && nativeBridge.tool === "razor") {
                        nativeBridge.razorAtPlayhead()
                    } else {
                        nativeBridge.setTool(modelData.id)
                    }
                }
            }
        }

        Item { Layout.fillHeight: true }

        ToolButtonChrome {
            Layout.alignment: Qt.AlignHCenter
            glyph: "zoom"
            tip: "Zoom timeline"
            onClicked: nativeBridge.setTimelineZoom(nativeBridge.timelineZoom >= 1.6 ? 1.0 : nativeBridge.timelineZoom + 0.3)
        }
    }
}
