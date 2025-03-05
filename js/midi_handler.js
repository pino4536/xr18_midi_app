class MidiHandler {
    constructor() {
        this.inputs = [];
        this.outputs = [];
        this.state = {
            volume: Array(18).fill(0),
            mute: Array(18).fill(false),
            pan: Array(18).fill(0)
        };
        this.listeners = {
            volume: [],
            mute: [],
            pan: []
        };
    }

    async init() {
        try {
            const midiAccess = await navigator.requestMIDIAccess();
            midiAccess.inputs.forEach(input => {
                input.onmidimessage = this.onMidiMessage.bind(this);
                this.inputs.push(input);
            });
            midiAccess.outputs.forEach(output => {
                this.outputs.push(output);
            });
        } catch (err) {
            console.error('MIDI access request failed:', err);
            document.getElementById('app').innerHTML += `<div class="error">MIDI access request failed: ${err.message}</div>`;
        }
    }

    onMidiMessage(event) {
        const [status, data1, data2] = event.data;
        const channel = (status & 0x0F) + 1;
        const command = status >> 4;

        if (command === 0xB) { // Control Change
            if (channel === 1) { // Volume Control
                this.updateState('volume', data1, data2);
            } else if (channel === 2) { // Mute Control
                this.updateState('mute', data1, data2);
            } else if (channel === 3) { // Pan Control
                this.updateState('pan', data1, data2);
            }
        }
    }

    updateState(param, ccNumber, value) {
        let channelIndex;
        if (ccNumber < 16) {
            channelIndex = ccNumber;
        } else if (ccNumber === 16) {
            channelIndex = 16; // For inputs 17-18
        }

        if (channelIndex !== undefined) {
            if (param === 'mute') {
                this.state.mute[channelIndex] = value > 0;
            } else {
                this.state[param][channelIndex] = value;
            }
            this.notifyListeners(param, channelIndex, value);
        }
    }

    addListener(param, callback) {
        if (this.listeners[param]) {
            this.listeners[param].push(callback);
        }
    }

    notifyListeners(param, channelIndex, value) {
        if (this.listeners[param]) {
            this.listeners[param].forEach(callback => callback(channelIndex, value));
        }
    }

    sendControlChange(channel, ccNumber, value) {
        const output = this.outputs[0];
        if (output) {
            output.send([0xB0 + (channel - 1), ccNumber, value]);
        }
    }

    sendProgramChange(channel, programNumber) {
        const output = this.outputs[0];
        if (output) {
            output.send([0xC0 + (channel - 1), programNumber]);
        }
    }
}

const midiHandler = new MidiHandler();
midiHandler.init();