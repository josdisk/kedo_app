import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import "KedovTheme.js" as T

Rectangle {
    id: root
    color: T.panel
    border.color: T.lineSoft

    function gradeSlider(label, value, setter) {
        return null
    }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        Rectangle {
            Layout.fillWidth: true
            Layout.preferredHeight: 36
            color: T.panelRaised
            border.color: T.lineSoft
            RowLayout {
                anchors.fill: parent
                anchors.margins: 6
                spacing: 4
                Repeater {
                    model: [
                        { id: "agent", label: "Agent" },
                        { id: "inspect", label: "Inspect" },
                        { id: "colour", label: "Colour" },
                        { id: "sound", label: "Sound" }
                    ]
                    delegate: Button {
                        text: modelData.label
                        onClicked: nativeBridge.setInspectorTab(modelData.id)
                        background: Rectangle {
                            radius: 4
                            color: nativeBridge.inspectorTab === modelData.id ? T.accentSoft : "transparent"
                            border.color: nativeBridge.inspectorTab === modelData.id ? T.accent : "transparent"
                        }
                        contentItem: Label {
                            text: parent.text
                            color: nativeBridge.inspectorTab === modelData.id ? T.ink : T.muted
                            font.pixelSize: 11
                            font.bold: nativeBridge.inspectorTab === modelData.id
                            horizontalAlignment: Text.AlignHCenter
                            verticalAlignment: Text.AlignVCenter
                            leftPadding: 8; rightPadding: 8
                            topPadding: 4; bottomPadding: 4
                        }
                    }
                }
                Item { Layout.fillWidth: true }
            }
        }

        // Agent
        ColumnLayout {
            visible: nativeBridge.workspace !== "deliver" && nativeBridge.inspectorTab === "agent"
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 0

            Flickable {
                Layout.fillWidth: true
                Layout.fillHeight: true
                contentHeight: agentCol.implicitHeight
                clip: true
                Column {
                    id: agentCol
                    width: parent.width
                    padding: 12
                    spacing: 8
                    Rectangle {
                        width: parent.width - 24
                        radius: 8
                        color: T.panelRaised
                        border.color: T.line
                        implicitHeight: replyCol.implicitHeight + 20
                        Column {
                            id: replyCol
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.top: parent.top
                            anchors.margins: 12
                            spacing: 6
                            Row {
                                spacing: 6
                                IconGlyph { name: "agent"; ink: T.accent; width: 14; height: 14 }
                                Label { text: "KeDo Agent"; color: T.muted; font.pixelSize: 10; font.bold: true }
                            }
                            Label {
                                width: parent.width
                                wrapMode: Text.WordWrap
                                color: T.ink
                                font.pixelSize: 12
                                lineHeight: 1.35
                                text: nativeBridge.agentReply
                            }
                        }
                    }
                    Label {
                        visible: nativeBridge.hasPlan
                        width: parent.width - 24
                        wrapMode: Text.WrapAnywhere
                        color: T.dim
                        font.family: T.monoFont
                        font.pixelSize: 9
                        text: nativeBridge.planJson.substring(0, 400) + (nativeBridge.planJson.length > 400 ? "…" : "")
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                Layout.preferredHeight: composer.implicitHeight + 20
                color: T.panelSunken
                border.color: T.line
                ColumnLayout {
                    id: composer
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8
                    TextArea {
                        Layout.fillWidth: true
                        Layout.preferredHeight: 78
                        wrapMode: TextEdit.Wrap
                        color: T.ink
                        font.pixelSize: 12
                        text: nativeBridge.agentPrompt
                        onTextChanged: if (text !== nativeBridge.agentPrompt) nativeBridge.setAgentPrompt(text)
                        background: Rectangle {
                            radius: 6
                            color: T.panelRaised
                            border.color: T.line
                        }
                        leftPadding: 8; rightPadding: 8; topPadding: 8; bottomPadding: 8
                    }
                    RowLayout {
                        Button {
                            text: nativeBridge.agentBusy ? "Working…" : "Create plan"
                            enabled: !nativeBridge.agentBusy && nativeBridge.agentPrompt.length > 0
                            Layout.fillWidth: true
                            onClicked: nativeBridge.createPlan()
                            background: Rectangle { radius: 6; color: enabled ? T.accent : "#334155" }
                            contentItem: Label {
                                text: parent.text
                                color: "white"
                                font.bold: true
                                font.pixelSize: 12
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                topPadding: 8; bottomPadding: 8
                            }
                        }
                        Button {
                            text: "Apply"
                            enabled: nativeBridge.hasPlan && !nativeBridge.agentBusy
                            onClicked: nativeBridge.applyPlan()
                            background: Rectangle {
                                radius: 6
                                color: "transparent"
                                border.color: parent.enabled ? T.line : "#222"
                            }
                            contentItem: Label {
                                text: parent.text
                                color: parent.enabled ? T.ink : T.dim
                                font.pixelSize: 12
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 12; rightPadding: 12
                            }
                        }
                    }
                }
            }
        }

        // Inspect
        Flickable {
            visible: nativeBridge.workspace !== "deliver" && nativeBridge.inspectorTab === "inspect"
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentHeight: inspectCol.implicitHeight
            clip: true
            ColumnLayout {
                id: inspectCol
                width: parent.width
                spacing: 10
                Label { text: "Selection"; color: T.muted; font.pixelSize: 10; font.bold: true; leftPadding: 12; topPadding: 12 }
                Repeater {
                    model: [
                        { k: "Clip", v: nativeBridge.selectedClipId || "—" },
                        { k: "Bin", v: nativeBridge.selectedBinId || "—" },
                        { k: "Playhead", v: nativeBridge.timecode },
                        { k: "Mark In", v: "" + nativeBridge.markIn },
                        { k: "Mark Out", v: "" + nativeBridge.markOut },
                        { k: "Tool", v: nativeBridge.tool },
                        { k: "Revision", v: "" + nativeBridge.sequenceRevision }
                    ]
                    delegate: RowLayout {
                        Layout.fillWidth: true
                        Layout.leftMargin: 12
                        Layout.rightMargin: 12
                        Label { text: modelData.k; color: T.dim; font.pixelSize: 11; Layout.preferredWidth: 78 }
                        Rectangle {
                            Layout.fillWidth: true
                            height: 26
                            radius: 4
                            color: T.panelSunken
                            border.color: T.line
                            Label {
                                anchors.verticalCenter: parent.verticalCenter
                                anchors.left: parent.left
                                anchors.leftMargin: 8
                                text: modelData.v
                                color: T.ink
                                font.pixelSize: 11
                                font.family: T.monoFont
                            }
                        }
                    }
                }
                Label {
                    Layout.fillWidth: true
                    Layout.margins: 12
                    wrapMode: Text.WordWrap
                    text: nativeBridge.probeSummary
                    color: T.muted
                    font.pixelSize: 11
                }
                Button {
                    Layout.leftMargin: 12
                    text: "Delete selected clip"
                    onClicked: nativeBridge.deleteSelectedClip()
                    background: Rectangle { radius: 6; color: T.panelRaised; border.color: T.danger }
                    contentItem: Label {
                        text: parent.text
                        color: T.danger
                        font.pixelSize: 12
                        leftPadding: 10; rightPadding: 10; topPadding: 8; bottomPadding: 8
                    }
                }
            }
        }

        // Colour
        Flickable {
            visible: nativeBridge.workspace !== "deliver" && (nativeBridge.inspectorTab === "colour" || nativeBridge.workspace === "colour")
            Layout.fillWidth: true
            Layout.fillHeight: true
            contentHeight: colourCol.implicitHeight
            clip: true
            ColumnLayout {
                id: colourCol
                width: parent.width
                spacing: 8
                Label { text: "Primary grade"; color: T.muted; font.pixelSize: 10; font.bold: true; leftPadding: 12; topPadding: 12 }
                RowLayout {
                    Layout.fillWidth: true
                    Layout.leftMargin: 12
                    Layout.rightMargin: 12
                    spacing: 8
                    Repeater {
                        model: ["Lift", "Gamma", "Gain"]
                        delegate: Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 88
                            radius: 8
                            color: T.panelSunken
                            border.color: T.line
                            Rectangle {
                                anchors.centerIn: parent
                                width: 54; height: 54; radius: 27
                                color: "transparent"
                                border.color: index === 0 ? "#6aa6ff" : index === 1 ? "#7dffb0" : "#ffb07a"
                                border.width: 2
                            }
                            Label {
                                anchors.bottom: parent.bottom
                                anchors.horizontalCenter: parent.horizontalCenter
                                anchors.bottomMargin: 6
                                text: modelData
                                color: T.muted
                                font.pixelSize: 10
                            }
                        }
                    }
                }
                component GradeSlider: ColumnLayout {
                    property string label
                    property real value
                    property var apply
                    Layout.fillWidth: true
                    Layout.leftMargin: 12
                    Layout.rightMargin: 12
                    spacing: 2
                    RowLayout {
                        Label { text: label; color: T.dim; font.pixelSize: 11; Layout.fillWidth: true }
                        Label { text: Math.round(value * 100); color: T.muted; font.pixelSize: 10; font.family: T.monoFont }
                    }
                    Slider {
                        Layout.fillWidth: true
                        from: 0; to: 1; value: parent.value
                        onMoved: parent.apply(value)
                        background: Rectangle {
                            x: parent.leftPadding
                            y: parent.topPadding + parent.availableHeight / 2 - 1
                            width: parent.availableWidth
                            height: 2
                            radius: 1
                            color: T.line
                            Rectangle {
                                width: parent.parent.visualPosition * parent.width
                                height: parent.height
                                color: T.accent
                                radius: 1
                            }
                        }
                        handle: Rectangle {
                            x: parent.leftPadding + parent.visualPosition * (parent.availableWidth - width)
                            y: parent.topPadding + parent.availableHeight / 2 - height / 2
                            width: 12; height: 12; radius: 6
                            color: T.ink
                        }
                    }
                }
                GradeSlider { label: "Temperature"; value: nativeBridge.temperature; apply: (v) => nativeBridge.setTemperature(v) }
                GradeSlider { label: "Tint"; value: nativeBridge.tint; apply: (v) => nativeBridge.setTint(v) }
                GradeSlider { label: "Contrast"; value: nativeBridge.contrast; apply: (v) => nativeBridge.setContrast(v) }
                GradeSlider { label: "Saturation"; value: nativeBridge.saturation; apply: (v) => nativeBridge.setSaturation(v) }
            }
        }

        // Sound / Deliver shared bottom
        ColumnLayout {
            visible: nativeBridge.workspace !== "deliver" && (nativeBridge.inspectorTab === "sound" || nativeBridge.workspace === "audio")
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 10
            Label { text: "Essential sound"; color: T.muted; font.pixelSize: 10; font.bold: true; leftPadding: 12; topPadding: 12 }
            Button {
                Layout.leftMargin: 12
                text: nativeBridge.enhanceSpeech ? "Enhance speech · ON" : "Enhance speech"
                onClicked: nativeBridge.setEnhanceSpeech(!nativeBridge.enhanceSpeech)
                background: Rectangle {
                    radius: 6
                    color: nativeBridge.enhanceSpeech ? T.accentSoft : T.panelRaised
                    border.color: nativeBridge.enhanceSpeech ? T.accent : T.line
                }
                contentItem: Label {
                    text: parent.text
                    color: T.ink
                    font.pixelSize: 12
                    horizontalAlignment: Text.AlignHCenter
                    verticalAlignment: Text.AlignVCenter
                    leftPadding: 12; rightPadding: 12; topPadding: 8; bottomPadding: 8
                }
            }
            component SoundSlider: ColumnLayout {
                property string label
                property real value
                property var apply
                Layout.fillWidth: true
                Layout.leftMargin: 12
                Layout.rightMargin: 12
                Label { text: label; color: T.dim; font.pixelSize: 11 }
                Slider {
                    Layout.fillWidth: true
                    from: 0; to: 1; value: parent.value
                    onMoved: parent.apply(value)
                    background: Rectangle {
                        x: parent.leftPadding
                        y: parent.topPadding + parent.availableHeight / 2 - 1
                        width: parent.availableWidth
                        height: 2
                        color: T.line
                        Rectangle {
                            width: parent.parent.visualPosition * parent.width
                            height: 2
                            color: T.teal
                        }
                    }
                    handle: Rectangle {
                        x: parent.leftPadding + parent.visualPosition * (parent.availableWidth - width)
                        y: parent.topPadding + parent.availableHeight / 2 - height / 2
                        width: 12; height: 12; radius: 6
                        color: T.ink
                    }
                }
            }
            SoundSlider { label: "Loudness"; value: nativeBridge.loudness; apply: (v) => nativeBridge.setLoudness(v) }
            SoundSlider { label: "Clip volume"; value: nativeBridge.volume; apply: (v) => nativeBridge.setVolume(v) }
            Item { Layout.fillHeight: true }
        }

        ColumnLayout {
            visible: nativeBridge.workspace === "deliver"
            Layout.fillWidth: true
            Layout.fillHeight: true
            spacing: 10
            Label { text: "Deliver"; color: T.muted; font.pixelSize: 10; font.bold: true; leftPadding: 12; topPadding: 12 }
            Label {
                Layout.leftMargin: 12
                Layout.rightMargin: 12
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                color: T.ink
                font.pixelSize: 12
                text: nativeBridge.exportStatus
            }
            ProgressBar {
                Layout.fillWidth: true
                Layout.leftMargin: 12
                Layout.rightMargin: 12
                from: 0; to: 1
                value: nativeBridge.exportProgress
                background: Rectangle { implicitHeight: 8; radius: 4; color: T.panelSunken }
                contentItem: Item {
                    implicitHeight: 8
                    Rectangle {
                        width: parent.parent.visualPosition * parent.width
                        height: parent.height
                        radius: 4
                        color: T.accent
                    }
                }
            }
            Button {
                Layout.leftMargin: 12
                text: nativeBridge.exporting ? "Cancel export" : "Start export"
                onClicked: nativeBridge.exporting ? nativeBridge.cancelExport() : nativeBridge.startExport()
                background: Rectangle { radius: 6; color: T.accent }
                contentItem: Label {
                    text: parent.text
                    color: "white"
                    font.bold: true
                    font.pixelSize: 12
                    leftPadding: 14; rightPadding: 14; topPadding: 8; bottomPadding: 8
                }
            }
            Item { Layout.fillHeight: true }
        }
    }
}
