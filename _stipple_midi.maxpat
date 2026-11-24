{
    "patcher": {
        "fileversion": 1,
        "appversion": {"major": 9, "minor": 1, "revision": 5, "architecture": "x64", "modernui": 1},
        "classnamespace": "box",
        "rect": [100.0, 100.0, 760.0, 390.0],
        "default_fontname": "Lato",
        "boxes": [
            {"box": {"id": "obj-1", "maxclass": "inlet", "index": 1, "numinlets": 0, "numoutlets": 1, "outlettype": [""], "patching_rect": [50.0, 25.0, 30.0, 30.0], "comment": "MIDI note, velocity, channel, time / prob / jitter"}},
            {"box": {"id": "obj-2", "maxclass": "newobj", "text": "routepass prob jitter", "numinlets": 3, "numoutlets": 3, "outlettype": ["", "", ""], "patching_rect": [50.0, 65.0, 148.0, 23.0]}},
            {"box": {"id": "obj-3", "maxclass": "newobj", "text": "unpack i i i f", "numinlets": 1, "numoutlets": 4, "outlettype": ["int", "int", "int", "float"], "patching_rect": [160.0, 100.0, 175.0, 23.0]}},
            {"box": {"id": "obj-4", "maxclass": "newobj", "text": "t b i", "numinlets": 1, "numoutlets": 2, "outlettype": ["bang", "int"], "patching_rect": [118.0, 134.0, 45.0, 23.0]}},
            {"box": {"id": "obj-5", "maxclass": "newobj", "text": "gen @gen _stipple_midi_event", "numinlets": 4, "numoutlets": 9, "outlettype": ["", "", "", "", "", "", "", "", ""], "patching_rect": [160.0, 166.0, 484.0, 23.0]}},

            {"box": {"id": "obj-6", "maxclass": "newobj", "text": "prepend set", "numinlets": 1, "numoutlets": 1, "outlettype": [""], "patching_rect": [160.0, 205.0, 80.0, 23.0]}},
            {"box": {"id": "obj-7", "maxclass": "newobj", "text": "pack 0 0 0 0.", "numinlets": 4, "numoutlets": 1, "outlettype": [""], "patching_rect": [160.0, 250.0, 171.0, 23.0]}},
            {"box": {"id": "obj-8", "maxclass": "newobj", "text": "route -1", "numinlets": 2, "numoutlets": 2, "outlettype": ["", ""], "patching_rect": [160.0, 288.0, 70.0, 23.0]}},
            {"box": {"id": "obj-9", "maxclass": "outlet", "index": 1, "numinlets": 1, "numoutlets": 0, "patching_rect": [210.0, 329.0, 30.0, 30.0], "comment": "Trigger event"}},

            {"box": {"id": "obj-10", "maxclass": "newobj", "text": "prepend set", "numinlets": 1, "numoutlets": 1, "outlettype": [""], "patching_rect": [398.0, 205.0, 80.0, 23.0]}},
            {"box": {"id": "obj-11", "maxclass": "newobj", "text": "pack 0 0 0 0.", "numinlets": 4, "numoutlets": 1, "outlettype": [""], "patching_rect": [398.0, 250.0, 171.0, 23.0]}},
            {"box": {"id": "obj-12", "maxclass": "newobj", "text": "route -1", "numinlets": 2, "numoutlets": 2, "outlettype": ["", ""], "patching_rect": [398.0, 288.0, 70.0, 23.0]}},
            {"box": {"id": "obj-13", "maxclass": "outlet", "index": 2, "numinlets": 1, "numoutlets": 0, "patching_rect": [448.0, 329.0, 30.0, 30.0], "comment": "Gate event"}},

            {"box": {"id": "obj-14", "maxclass": "newobj", "text": "sel 1", "numinlets": 2, "numoutlets": 2, "outlettype": ["bang", ""], "patching_rect": [624.0, 205.0, 40.0, 23.0]}},
            {"box": {"id": "obj-15", "maxclass": "newobj", "text": "deferlow", "numinlets": 1, "numoutlets": 1, "outlettype": [""], "patching_rect": [624.0, 246.0, 60.0, 23.0]}},
            {"box": {"id": "obj-16", "maxclass": "message", "text": "MIDI Gate note capacity exceeded", "numinlets": 2, "numoutlets": 1, "outlettype": [""], "patching_rect": [518.0, 285.0, 195.0, 23.0]}},
            {"box": {"id": "obj-17", "maxclass": "newobj", "text": "print Stipple", "numinlets": 1, "numoutlets": 0, "patching_rect": [518.0, 331.0, 90.0, 23.0]}}
        ],
        "lines": [
            {"patchline": {"source": ["obj-1", 0], "destination": ["obj-2", 0]}},
            {"patchline": {"source": ["obj-2", 0], "destination": ["obj-5", 0]}},
            {"patchline": {"source": ["obj-2", 1], "destination": ["obj-5", 0]}},
            {"patchline": {"source": ["obj-2", 2], "destination": ["obj-3", 0]}},
            {"patchline": {"source": ["obj-3", 3], "destination": ["obj-5", 3]}},
            {"patchline": {"source": ["obj-3", 2], "destination": ["obj-5", 2]}},
            {"patchline": {"source": ["obj-3", 1], "destination": ["obj-5", 1]}},
            {"patchline": {"source": ["obj-3", 0], "destination": ["obj-4", 0]}},
            {"patchline": {"source": ["obj-4", 1], "destination": ["obj-5", 0]}},
            {"patchline": {"source": ["obj-4", 0], "destination": ["obj-7", 0], "order": 0}},
            {"patchline": {"source": ["obj-4", 0], "destination": ["obj-11", 0], "order": 1}},

            {"patchline": {"source": ["obj-5", 0], "destination": ["obj-6", 0]}},
            {"patchline": {"source": ["obj-5", 1], "destination": ["obj-7", 1]}},
            {"patchline": {"source": ["obj-5", 2], "destination": ["obj-7", 2]}},
            {"patchline": {"source": ["obj-5", 3], "destination": ["obj-7", 3]}},
            {"patchline": {"source": ["obj-6", 0], "destination": ["obj-7", 0]}},
            {"patchline": {"source": ["obj-7", 0], "destination": ["obj-8", 0]}},
            {"patchline": {"source": ["obj-8", 1], "destination": ["obj-9", 0]}},

            {"patchline": {"source": ["obj-5", 4], "destination": ["obj-10", 0]}},
            {"patchline": {"source": ["obj-5", 5], "destination": ["obj-11", 1]}},
            {"patchline": {"source": ["obj-5", 6], "destination": ["obj-11", 2]}},
            {"patchline": {"source": ["obj-5", 7], "destination": ["obj-11", 3]}},
            {"patchline": {"source": ["obj-10", 0], "destination": ["obj-11", 0]}},
            {"patchline": {"source": ["obj-11", 0], "destination": ["obj-12", 0]}},
            {"patchline": {"source": ["obj-12", 1], "destination": ["obj-13", 0]}},

            {"patchline": {"source": ["obj-5", 8], "destination": ["obj-14", 0]}},
            {"patchline": {"source": ["obj-14", 0], "destination": ["obj-15", 0]}},
            {"patchline": {"source": ["obj-15", 0], "destination": ["obj-16", 0]}},
            {"patchline": {"source": ["obj-16", 0], "destination": ["obj-17", 0]}}
        ]
    }
}
