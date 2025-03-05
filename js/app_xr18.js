class AppXR18 {
    constructor(midiHandler) {
        this.midiHandler = midiHandler;
        this.container = document.getElementById('channels');
        this.channels = [];
        this.initUI();
        this.bindMidiListeners();
    }

    initUI() {
        const rows = [
            { start: 1, end: 8 },
            { start: 9, end: 17 },
            { start: 18, end: 32 },
            //{ start: 22, end: 32 },
        ];

        rows.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row';
            for (let i = row.start; i <= row.end; i++) {
                const channelDiv = document.createElement('div');
                let channel_name_innerHTML;
                if (i <=16){
                    channel_name_innerHTML = `In ${i}`;
                } else if (i == 17) {
                    channel_name_innerHTML = `In 17-18`;
                } else if (i >= 18 && i <= 19) {  // 18: FX 1; 19: FX 2, 20 / 21 FX track not in used
                    channel_name_innerHTML = `Fx ${i-17}`;
                } else if (i >= 22 && i <= 27) {
                    channel_name_innerHTML = `Aux ${i-21}`;
                } else if (i == 32) {
                    channel_name_innerHTML = `Main`;
                } else {
                    this.channels.push({channelIndex: '(skip)'});
                    continue; // skip other channels
                }
                channelDiv.className = 'channel';
                channelDiv.innerHTML = `
                    <h3>
                        <span>${channel_name_innerHTML}</span>
                        <button class="mute-button">M</button>
                    </h3>
                    <div class="pan-value" id="pan-value-${i}"><i>(Pan. N/A)</i></div>
                    <div class="pan-control">
                        <div class="fill-left" id="fill-left-${i}"></div>
                        <div class="fill-right" id="fill-right-${i}"></div>
                        <div class="handle" id="handle-${i}"></div>
                    </div>
                    <div class="volume-value" id="volume-value-${i}"><i>(Vol. N/A)</i></div>
                    <div class="fader">
                        <div class="handle"></div>
                    </div>
                `;
                const channelIndex = i - 1; // Map i to channelIndex
                rowDiv.appendChild(channelDiv);
                this.channels.push({
                    fader: channelDiv.querySelector('.fader .handle'),
                    muteButton: channelDiv.querySelector('.mute-button'),
                    panControl: channelDiv.querySelector('.pan-control'),
                    fillLeft: channelDiv.querySelector(`#fill-left-${i}`),
                    fillRight: channelDiv.querySelector(`#fill-right-${i}`),
                    panHandle: channelDiv.querySelector(`#handle-${i}`),
                    volumeValueDisplay: channelDiv.querySelector(`#volume-value-${i}`),
                    panValueDisplay: channelDiv.querySelector(`#pan-value-${i}`),
                    channelIndex: channelIndex // Store channelIndex in the channel object
                });
            }
            this.container.appendChild(rowDiv);
        });
    }

    bindMidiListeners() {
        this.midiHandler.addListener('volume', (channelIndex, value) => {
            this.updateFader(channelIndex, value);
            this.updateVolumeValueDisplay(channelIndex, value);
        });

        this.midiHandler.addListener('mute', (channelIndex, value) => {
            this.updateMuteButton(channelIndex, value > 0);
        });

        this.midiHandler.addListener('pan', (channelIndex, value) => {
            this.updatePanControl(channelIndex, value);
            this.updatePanValueDisplay(channelIndex, value);
        });
    }

    bindUIListeners() {
        this.channels.forEach((channel) => {
            const { fader, muteButton, panControl, channelIndex } = channel;

            if (channelIndex === '(skip)') {
                return; // skipped channels were appended {channelIndex: '(skip)'}
            }
            
            fader.addEventListener('mousedown', (event) => {
                event.preventDefault(); // Prevent text selection
                this.startFaderDrag(event, channelIndex);
            });

            muteButton.addEventListener('click', () => {
                const isMuted = muteButton.classList.toggle('muted');
                const value = isMuted ? 127 : 0;
                this.midiHandler.sendControlChange(2, channelIndex, value);
                console.log(`MIDI Message Sent: Channel 2, CC ${channelIndex}, Value ${value}`);
            });

            panControl.addEventListener('mousedown', (event) => {
                event.preventDefault(); // Prevent text selection
                this.startPanControlDrag(event, channelIndex);
            });

            panControl.addEventListener('dblclick', () => {
                this.resetPanControl(channelIndex);
                console.log(`MIDI Message Sent: Channel 3, CC ${channelIndex}, Value 64`);
            });
        });
    }

    updateFader(channelIndex, value) {
        const fader = this.channels[channelIndex].fader;
        const height = fader.parentElement.offsetHeight -20; // Subtract padding-bottom
        fader.style.bottom = `${(value / 127) * height}px`;
    }

    updateMuteButton(channelIndex, isMuted) {
        const muteButton = this.channels[channelIndex].muteButton;
        muteButton.classList.toggle('muted', isMuted);
    }

    updatePanControl(channelIndex, value) {
        const panControl = this.channels[channelIndex].panControl;
        const fillLeft = this.channels[channelIndex].fillLeft;
        const fillRight = this.channels[channelIndex].fillRight;
        const panHandle = this.channels[channelIndex].panHandle;
        const width = panControl.offsetWidth;

        const handlePosition = (value / 127) * width;
        panHandle.style.left = `${handlePosition}px`; // Center the handle

        if (value === 64) {
            fillLeft.style.width = `0px`;
            fillRight.style.width = `0px`;
        } else 
        if (value < 64) {
            fillLeft.style.width = `${(handlePosition)}px`;
            fillRight.style.width = `0px`;
        } else {
            fillLeft.style.width = `0px`;
            fillRight.style.width = `${width - handlePosition}px`;
            fillRight.style.left = `${handlePosition}px`;
        }
    }

    resetPanControl(channelIndex) {
        const panControl = this.channels[channelIndex].panControl;
        const panHandle = this.channels[channelIndex].panHandle;
        const width = panControl.offsetWidth;

        panHandle.style.left = `${width / 2 - 2.5}px`; // Center the handle
        this.midiHandler.sendControlChange(3, channelIndex, 64);
        console.log(`MIDI Message Sent: Channel 3, CC ${channelIndex}, Value 64`);
        this.updatePanControl(channelIndex, 64);
        this.updatePanValueDisplay(channelIndex, 64);
    }

    startFaderDrag(event, channelIndex) {
        const fader = this.channels[channelIndex].fader;
        const faderParent = fader.parentElement;
        const height = faderParent.offsetHeight - 10; // Subtract padding-bottom

        const onMouseMove = (e) => {
            const rect = faderParent.getBoundingClientRect();
            let bottom = e.clientY - rect.top;
            bottom = Math.max(0, Math.min(height, bottom));
            const value = Math.round(((-bottom) / height + 1) * 127);
            this.updateFader(channelIndex, value);
            this.midiHandler.sendControlChange(1, channelIndex, value);
            console.log(`MIDI Message Sent: Channel 1, CC ${channelIndex}, Value ${value}`);
            this.updateVolumeValueDisplay(channelIndex, value);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    startPanControlDrag(event, channelIndex) {
        const panControl = this.channels[channelIndex].panControl;
        const rect = panControl.getBoundingClientRect();
        const width = panControl.offsetWidth;

        const onMouseMove = (e) => {
            let left = e.clientX - rect.left;
            left = Math.max(0, Math.min(width, left));
            const value = Math.round((left / width) * 127);
            this.midiHandler.sendControlChange(3, channelIndex, value);
            this.updatePanControl(channelIndex, value);
            console.log(`MIDI Message Sent: Channel 3, CC ${channelIndex}, Value ${value}`);
            this.updatePanValueDisplay(channelIndex, value);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }

    updateVolumeValueDisplay(channelIndex, value) {
        const volumeValueDisplay = this.channels[channelIndex].volumeValueDisplay;
        volumeValueDisplay.textContent = `Volume: ${value}`;
    }

    updatePanValueDisplay(channelIndex, value) {
        const panValueDisplay = this.channels[channelIndex].panValueDisplay;
        if (value === 64) {
            panValueDisplay.textContent = `Center`;
        } else if (value < 64) {
            panValueDisplay.textContent = `L ${64 - value}`;
        } else {
            panValueDisplay.textContent = `R ${value - 64}`;
        }
    }

    start() {
        this.bindUIListeners();
    }
}

const app = new AppXR18(midiHandler);
app.start();