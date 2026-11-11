import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    color: T.panelSunken
    border.color: T.lineSoft

    readonly property real playheadPct: nativeBridge.durationFrames > 1
        ? nativeBridge.playheadFrame / (nativeBridge.durationFrames - 1) : 0
    readonly property var trackOrder: ["V2", "V1", "A1", "A2"]

    function clipsFor(track) {
        const all = nativeBridge.clips
        const out = []
        for (let i = 0; i < all.length; ++i) {
            if (all[i].track === track) out.push(all[i])
        }
        return out
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 34
            color: T.panel
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 8
                anchors.rightMargin: 10
                spacing: 8
                Label {
                    text: "Timeline  ·  seq_main  ·  rev " + nativeBridge.sequenceRevision
                    color: T.ink
                    font.pixelSize: 12
                    font.bold: true
                }
                Button {
                    text: "Manual edit"
                    onClicked: nativeBridge.setTool("select")
                    background: Rectangle {
                        radius: 4
                        color: nativeBridge.tool === "select" ? T.accentSoft : "transparent"
                        border.color: nativeBridge.tool === "select" ? T.accent : T.line
                    }
                    contentItem: Label {
                        text: parent.text
                        color: T.ink
                        font.pixelSize: 10
                        leftPadding: 8; rightPadding: 8
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Button {
                    text: "Add shot"
                    onClicked: nativeBridge.addShot()
                    background: Rectangle { radius: 4; color: "transparent"; border.color: T.line }
                    contentItem: Label {
                        text: parent.text
                        color: T.muted
                        font.pixelSize: 10
                        leftPadding: 8; rightPadding: 8
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Button {
                    text: "Razor"
                    onClicked: {
                        nativeBridge.setTool("razor")
                        nativeBridge.razorAtPlayhead()
                    }
                    background: Rectangle { radius: 4; color: "transparent"; border.color: T.line }
                    contentItem: Label {
                        text: parent.text
                        color: T.muted
                        font.pixelSize: 10
                        leftPadding: 8; rightPadding: 8
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                    }
                }
                Item { Layout.fillWidth: true }
                Label {
                    text: "gen " + nativeBridge.generation
                    color: T.dim
                    font.family: T.monoFont
                    font.pixelSize: 10
                }
                Slider {
                    id: zoom
                    from: 0.4; to: 2.0
                    value: nativeBridge.timelineZoom
                    onMoved: nativeBridge.setTimelineZoom(value)
                    Layout.preferredWidth: 90
                    background: Rectangle {
                        x: parent.leftPadding
                        y: parent.topPadding + parent.availableHeight / 2 - 1
                        width: parent.availableWidth; height: 2; color: T.line
                        Rectangle {
                            width: parent.parent.visualPosition * parent.width
                            height: 2; color: T.muted
                        }
                    }
                    handle: Rectangle {
                        x: parent.leftPadding + parent.visualPosition * (parent.availableWidth - width)
                        y: parent.topPadding + parent.availableHeight / 2 - height / 2
                        width: 10; height: 10; radius: 5; color: T.ink
                    }
                }
            }
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            Rectangle {
                Layout.preferredWidth: 88
                Layout.fillHeight: true
                color: T.panel
                border.color: T.lineSoft
                ColumnLayout {
                    anchors.fill: parent
                    anchors.topMargin: 22
                    spacing: 4
                    Repeater {
                        model: root.trackOrder
                        delegate: Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: modelData.startsWith("V") ? 48 : 32
                            Layout.leftMargin: 4
                            Layout.rightMargin: 4
                            radius: 4
                            color: T.panelRaised
                            border.color: T.lineSoft
                            Label {
                                anchors.centerIn: parent
                                text: modelData
                                color: T.ink
                                font.family: T.monoFont
                                font.pixelSize: 11
                                font.bold: true
                            }
                        }
                    }
                    Item { Layout.fillHeight: true }
                }
            }

            Item {
                Layout.fillWidth: true
                Layout.fillHeight: true
                clip: true

                ColumnLayout {
                    anchors.fill: parent
                    spacing: 0

                    Item {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 22
                        Rectangle { anchors.fill: parent; color: T.panel; border.color: T.lineSoft }
                        Row {
                            anchors.fill: parent
                            anchors.leftMargin: 4
                            Repeater {
                                model: 12
                                delegate: Item {
                                    width: parent.width / 12
                                    height: parent.height
                                    Rectangle { width: 1; height: parent.height; color: T.line; anchors.left: parent.left }
                                    Label {
                                        anchors.left: parent.left
                                        anchors.leftMargin: 4
                                        anchors.verticalCenter: parent.verticalCenter
                                        text: "00:00:" + ((index * 2) < 10 ? "0" : "") + (index * 2)
                                        color: T.dim
                                        font.pixelSize: 9
                                        font.family: T.monoFont
                                    }
                                }
                            }
                        }
                        MouseArea {
                            anchors.fill: parent
                            onClicked: {
                                const f = Math.round((mouse.x / width) * (nativeBridge.durationFrames - 1))
                                nativeBridge.setPlayhead(f)
                            }
                        }
                    }

                    Slider {
                        id: scrub
                        Layout.fillWidth: true
                        Layout.preferredHeight: 16
                        from: 0
                        to: Math.max(0, nativeBridge.durationFrames - 1)
                        value: nativeBridge.playheadFrame
                        onMoved: nativeBridge.setPlayhead(Math.round(value))
                        background: Rectangle {
                            x: scrub.leftPadding
                            y: scrub.topPadding + scrub.availableHeight / 2 - 1
                            width: scrub.availableWidth
                            height: 2
                            color: T.line
                            Rectangle {
                                width: scrub.visualPosition * parent.width
                                height: 2
                                color: T.playhead
                            }
                        }
                        handle: Rectangle {
                            x: scrub.leftPadding + scrub.visualPosition * (scrub.availableWidth - width)
                            y: scrub.topPadding + scrub.availableHeight / 2 - height / 2
                            width: 10; height: 10; radius: 5
                            color: T.playhead
                            border.color: "#9ec1ff"
                        }
                    }

                    Flickable {
                        id: laneFlick
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        contentWidth: width * nativeBridge.timelineZoom
                        contentHeight: height
                        clip: true
                        boundsBehavior: Flickable.StopAtBounds

                        Item {
                            width: Math.max(laneFlick.width, laneFlick.contentWidth)
                            height: laneFlick.height

                            Column {
                                id: laneCol
                                anchors.fill: parent
                                anchors.margins: 4
                                spacing: 4

                                Repeater {
                                    model: root.trackOrder
                                    delegate: Item {
                                        required property string modelData
                                        width: laneCol.width
                                        height: modelData.startsWith("V") ? 48 : 32

                                        Rectangle {
                                            anchors.fill: parent
                                            radius: 4
                                            color: "#151820"
                                            border.color: T.lineSoft
                                        }

                                        MouseArea {
                                            anchors.fill: parent
                                            onClicked: {
                                                if (nativeBridge.tool === "razor") {
                                                    const f = Math.round((mouse.x / width) * (nativeBridge.durationFrames - 1))
                                                    nativeBridge.setPlayhead(f)
                                                    nativeBridge.razorAtPlayhead()
                                                } else {
                                                    const f = Math.round((mouse.x / width) * (nativeBridge.durationFrames - 1))
                                                    nativeBridge.setPlayhead(f)
                                                }
                                            }
                                        }

                                        Repeater {
                                            model: root.clipsFor(modelData)
                                            delegate: Rectangle {
                                                required property var modelData
                                                x: parent.width * modelData.x
                                                y: 3
                                                width: Math.max(24, parent.width * modelData.w)
                                                height: parent.height - 6
                                                radius: 4
                                                color: modelData.color
                                                border.color: modelData.selected ? "#ffffff" : "#ffffff22"
                                                border.width: modelData.selected ? 2 : 1
                                                clip: true
                                                z: 2

                                                Canvas {
                                                    anchors.fill: parent
                                                    anchors.margins: 1
                                                    property bool isWave: modelData.wave === true
                                                    onPaint: {
                                                        const ctx = getContext("2d")
                                                        ctx.reset()
                                                        if (isWave) {
                                                            ctx.strokeStyle = "rgba(0,0,0,0.35)"
                                                            ctx.lineWidth = 1
                                                            const mid = height / 2
                                                            ctx.beginPath()
                                                            for (let i = 0; i < width; i += 3) {
                                                                const amp = (Math.sin(i * 0.2) * 0.35 + Math.sin(i * 0.05) * 0.2) * height * 0.4
                                                                ctx.moveTo(i, mid - amp)
                                                                ctx.lineTo(i, mid + amp)
                                                            }
                                                            ctx.stroke()
                                                        } else {
                                                            for (let x = 0; x < width; x += 18) {
                                                                ctx.fillStyle = "rgba(255,255,255,0.12)"
                                                                ctx.fillRect(x, 2, 16, height - 16)
                                                            }
                                                        }
                                                    }
                                                    Component.onCompleted: requestPaint()
                                                    onWidthChanged: requestPaint()
                                                }

                                                Label {
                                                    anchors.left: parent.left
                                                    anchors.bottom: parent.bottom
                                                    anchors.margins: 5
                                                    text: modelData.title
                                                    color: "#ffffff"
                                                    font.pixelSize: 10
                                                    font.bold: true
                                                    style: Text.Outline
                                                    styleColor: "#00000066"
                                                }

                                                MouseArea {
                                                    anchors.fill: parent
                                                    onClicked: {
                                                        if (nativeBridge.tool === "razor") {
                                                            nativeBridge.selectClip(modelData.id)
                                                            nativeBridge.razorAtPlayhead()
                                                        } else {
                                                            nativeBridge.selectClip(modelData.id)
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            Rectangle {
                                width: 2
                                anchors.top: parent.top
                                anchors.bottom: parent.bottom
                                x: parent.width * root.playheadPct
                                color: T.playhead
                                z: 5
                                Rectangle {
                                    width: 9; height: 9; radius: 1
                                    color: T.playhead
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    anchors.top: parent.top
                                    rotation: 45
                                }
                            }
                        }
                    }
                }
            }

            AudioMeters { Layout.fillHeight: true }
        }

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 22
            color: T.panel
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.leftMargin: 10
                anchors.rightMargin: 10
                Label {
                    text: nativeBridge.statusMessage
                    color: T.muted
                    font.pixelSize: 10
                    elide: Text.ElideRight
                    Layout.fillWidth: true
                }
                Label {
                    text: nativeBridge.snapEnabled ? "Snap on" : "Snap off"
                    color: T.dim
                    font.pixelSize: 10
                }
            }
        }
    }
}
