// ==UserScript==
// @name         Reader
// @description  Add a TTS reader to targeted websites.
// @version      1.03
// @match        https://www.bloomberg.com/*
// @updateURL    https://raw.githubusercontent.com/leomike/Userscripts/main/reader.js
// @downloadURL  https://raw.githubusercontent.com/leomike/Userscripts/main/reader.js
// @icon         https://api.iconify.design/bx/user-voice.svg
// ==/UserScript==

(function () {
    'use strict';

    const tts_synthesis = window.speechSynthesis;

    /**System default prefered voice if none is set in a cookie. */
    let tts_defaultVoicePreferences = ['Google UK English Male', 'Microsoft Mark - English (United States)', 'Chrome OS US English 4'];

    /**Current playback position within *tts_segments*. */
    let tts_position = -1;

    /**Current playback status, this is used due to the unreliability of *speechSynthesis.pause* and *speechSynthesis.speaking* on some systems. */
    let tts_status = 'stopped';

    /**Store the segments to be spoken as HTML references. */
    let tts_segments = [];

    /**Execute the play or pause action as appropriate. */
    function tts_playPause() {
        // Reset the position and load the elements if playback is starting
        if (tts_position < 0 || tts_status == 'stopped') {
            tts_position = 0;
            tts_loadText();
        }

        // Select the appropriate action between play and pause
        if (tts_status == 'playing')
            tts_pause();
        else
            tts_play();
    }

    /**Play the page or resume playback if it was previously paused. */
    function tts_play() {
        console.log('▶️');

        // Change to a pause button
        document.getElementById('tts_buttonPlayPause').classList.add('tts_pause');

        // Move the highlight
        tts_highlight();

        if (tts_status == 'paused' && (tts_synthesis.paused || tts_synthesis.speaking)) {
            // If playback was paused, resume it
            tts_synthesis.resume();
            tts_status = 'playing';
            console.log('⚠️ Playback resumed');
        }
        else {
            // Otherwise, read the next element if we haven't reached the end
            if (tts_position < tts_segments.length) {
                tts_status = 'playing';
                tts_speak(tts_sanitizeText(tts_segments[tts_position].innerText));
            }
            else
                tts_stop();
        }
    }

    /**Play the next element. */
    function tts_next() {
        console.log('⏭️');

        // Cancel any ongoing playback
        tts_status = 'stopped';
        tts_synthesis.cancel();

        // Play the appropriate segment
        tts_position += 1;
        if (tts_position >= tts_segments.length && tts_segments.length > 0)
            tts_position = tts_segments.length - 1;

        tts_play();
    }

    /**Play the previous element. */
    function tts_previous() {
        console.log('⏮️');

        // Cancel any ongoing playback
        tts_status = 'stopped';
        tts_synthesis.cancel();

        // Play the appropriate segment
        tts_position -= 1;
        if (tts_position < 0)
            tts_position = 0;

        tts_play();
    }

    /**Pause the current playback. */
    function tts_pause() {
        console.log('⏸️');

        // Change to a play button
        document.getElementById('tts_buttonPlayPause').classList.remove('tts_pause');

        if (tts_synthesis.speaking) {
            // Pause any ongoing playback
            tts_status = 'paused';
            tts_synthesis.pause();
            console.log('⚠️ Playback paused');
        }
        else {
            // If we are between paragraph or segments, try pausing now and again soon
            tts_synthesis.pause();
            window.setTimeout(function () { tts_pause(); }, 200);
        }
    }

    /**Remove current highlights and add an highlight to the currently read element. */
    function tts_highlight() {
        // Remove from all elements
        var highlights = document.getElementsByClassName('tts_highlight');
        for (var highlight of highlights) {
            console.log('🖊️ Removing highlight from paragraph');
            highlight.classList.remove('tts_highlight');
        }

        // Add highlight to the current element
        if (tts_position >= 0 && tts_position < tts_segments.length) {
            console.log('🖊️ Highlighting paragraph');
            tts_segments[tts_position].classList.add('tts_highlight');

            // Scroll to the correct position
            tts_segments[tts_position].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    /**Stop the current playback and reset the reading position to the start. */
    function tts_stop() {
        console.log('⏹️');

        // Stop the playback
        document.getElementById('tts_buttonPlayPause').classList.remove('tts_pause');
        tts_status = 'stopped';
        tts_synthesis.cancel();
        console.log('⚠️ Playback stopped');

        // Reset the position
        tts_position = -1;
        tts_segments = [];
        tts_highlight();
    }

    /**Process some elements to make the spoken text flow better. */
    function tts_sanitizeText(text) {
        text = text.replace(/<\/?[^>]+(>|$)/g, ''); // Remove HTML tags
        text = text.replace(/(\.{3}|…)/g, '.'); // Remove ellipsis
        text = text.replace(/([$€£¥])([0-9., ]+)/g, '$2 $1'); // Adjust order for currencies

        // Google's online TTS doesn't support long text, we break it up in parts at logical pause points
        if (document.getElementById('tts_voiceSelector').value.startsWith('Google')) {
            text = text.replace(/([.!?—:] |[()“”])/g, '$1¬');
            text = text.split('¬');
        }

        return text;
    }

    /**Get the list of all available voices for the given language. */
    function tts_getVoicesList(language) {
        // Get all voices available on the system
        var voices = tts_synthesis.getVoices();

        // Filter only for the requested language
        voices = voices.filter(voice => voice.lang.startsWith(language));

        return voices;
    }

    /**Speak out the given text. */
    function tts_speak(text) {
        // If we receive an array, set each part to be spoken separately
        if (text instanceof Array) {
            for (var item of text) {
                tts_speak(item);
            }
        }
        else {
            // Prepare the text to be spoken
            var tts_utterance = new SpeechSynthesisUtterance();
            tts_utterance.voice = tts_synthesis.getVoices().filter(voice => voice.voiceURI == document.getElementById('tts_voiceSelector').value)[0];
            tts_utterance.rate = document.getElementById('tts_rate').value / 10;
            tts_utterance.pitch = document.getElementById('tts_pitch').value / 10;
            tts_utterance.text = text;

            // Set function for when the discussion is over
            tts_utterance.onend = function (e) {
                // Read the next segment after if the playback wasn't stopped and isn't ongoing
                if (tts_status == 'playing' && !tts_synthesis.speaking) {
                    tts_position += 1;
                    tts_play();
                }
            };

            // Speak the text
            tts_synthesis.speak(tts_utterance);
            console.log('🗣️ ' + text);
        }
    }

    /**Toggle the parameters to be displayed or hidden as appropriate. */
    function tts_toggleParameters() {
        document.getElementById('tts_parameters').style.display = (document.getElementById('tts_parameters').style.display == 'none' ? 'flex' : 'none');
    }

    /**Load the text to *tts_segments* to be used at a later point. */
    function tts_loadText() {
        // Get the text to display
        tts_processElements(document.getElementsByClassName('body-content')[0].children);
    }

    /**Process the given root elements for it's children to be spoken. Only speaks titles, paragraphs, and list elements. */
    function tts_processElements(elements) {
        for (var element of elements) {
            // Add directly titles, paragraphs, and list elements
            if ((element.tagName.startsWith == 'H' && element.tagName.length == 2) || element.tagName == 'P' || element.tagName == 'LI') {
                tts_segments.push(element);
            }

            // For other elements, go deeper to see if they might contain a speakable element
            else {
                tts_processElements(element.children);
            }
        }
    }

    /**Saves all the voice parameters when one is changed. */
    function tts_voiceParameterChanged() {
        document.cookie = 'tts_voice=' + document.getElementById('tts_voiceSelector').value + '; max-age=7776000; path=/';
        document.cookie = 'tts_voiceRate=' + document.getElementById('tts_rate').value + '; max-age=7776000; path=/';
        document.cookie = 'tts_voicePitch=' + document.getElementById('tts_pitch').value + '; max-age=7776000; path=/';
    }

    /**Read the given cookie or returns *def* if it doesn't exist. */
    function tts_getCookie(name, def) {
        var cookie = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
        var value = cookie ? cookie.pop() : def;
        console.log('🍪 ' + name + ' = ' + value);
        return value;
    }

    /**Setup the player. */
    function tts_setup() {
        // Inject the player
        var ttsContainer = document.createElement('div');
        ttsContainer.id = 'tts_box';

        // Parameter container
        var parameterContainer = document.createElement('div');
        parameterContainer.id = 'tts_parameters';
        parameterContainer.style.display = 'none';
        ttsContainer.appendChild(parameterContainer);

        // Slider container
        var sliderContainer = document.createElement('div');
        sliderContainer.id = 'tts_sliders';
        parameterContainer.appendChild(sliderContainer);

        // Rate slider
        var rateSlider = document.createElement('input');
        rateSlider.id = 'tts_rate';
        rateSlider.type = 'range';
        rateSlider.min = '10';
        rateSlider.max = '20';
        rateSlider.value = tts_getCookie('tts_voiceRate', '14');
        rateSlider.onchange = tts_voiceParameterChanged;
        sliderContainer.appendChild(rateSlider);

        // Pitch slider
        var pitchSlider = document.createElement('input');
        pitchSlider.id = 'tts_pitch';
        pitchSlider.type = 'range';
        pitchSlider.min = '5';
        pitchSlider.max = '15';
        pitchSlider.value = tts_getCookie('tts_voicePitch', '8');
        pitchSlider.onchange = tts_voiceParameterChanged;
        sliderContainer.appendChild(pitchSlider);

        // Voice selector with all available voices
        const voicesList = tts_getVoicesList('en');
        var voiceSelector = document.createElement('select');
        voiceSelector.id = 'tts_voiceSelector';
        voiceSelector.onchange = tts_voiceParameterChanged;
        parameterContainer.appendChild(voiceSelector);
        for (var voice of voicesList) {
            var voiceOption = document.createElement('option');
            voiceOption.value = voice.voiceURI;
            voiceOption.innerHTML = voice.name;
            voiceSelector.appendChild(voiceOption);
        }
        console.log(voicesList);
        tts_defaultVoicePreferences.unshift(tts_getCookie('tts_voice', ''));
        for (var voiceName of tts_defaultVoicePreferences) {
            // Find if the voice exists and, if so, set it as the voice
            if (tts_synthesis.getVoices().filter(voice => voice.voiceURI == voiceName).length == 1) {
                voiceSelector.value = voiceName;
                break;
            }
        }

        // Control container
        var controlContainer = document.createElement('div');
        controlContainer.id = 'tts_controls';
        ttsContainer.appendChild(controlContainer);

        // Settings button
        var parametersButton = document.createElement('button');
        parametersButton.id = 'tts_buttonParameters';
        parametersButton.onclick = tts_toggleParameters;
        parametersButton.classList.add('tts_button');
        controlContainer.appendChild(parametersButton);

        // Previous button
        var previousButton = document.createElement('button');
        previousButton.id = 'tts_buttonBack';
        previousButton.onclick = tts_previous;
        previousButton.classList.add('tts_button');
        controlContainer.appendChild(previousButton);

        // Play button
        var playButton = document.createElement('button');
        playButton.id = 'tts_buttonPlayPause';
        playButton.onclick = tts_playPause;
        playButton.classList.add('tts_button');
        controlContainer.appendChild(playButton);

        // Stop button
        var stopButton = document.createElement('button');
        stopButton.id = 'tts_buttonStop';
        stopButton.onclick = tts_stop;
        stopButton.classList.add('tts_button');
        controlContainer.appendChild(stopButton);

        // Previous button
        var nextButton = document.createElement('button');
        nextButton.id = 'tts_buttonNext';
        nextButton.onclick = tts_next;
        nextButton.classList.add('tts_button');
        controlContainer.appendChild(nextButton);

        document.getElementsByTagName('body')[0].appendChild(ttsContainer);

        // Inject the stylesheet
        var style = document.createElement('style');
        style.innerHTML = '#tts_box { position: fixed; right: 5%; bottom: 0px; background: #fff; border-color: #767676; border-width: 1px 1px 0px 1px; border-style: solid; display: flex; align-items: center; padding: 8px; z-index: 100; }';
        style.innerHTML += '#tts_parameters { display: flex; flex-direction: column; margin-right: 10px; }';
        style.innerHTML += '#tts_sliders { display: flex; }';
        style.innerHTML += '#tts_sliders > * { flex-grow: 1; }';
        style.innerHTML += '#tts_voiceSelector { border-radius: 5px; background: none; }';
        style.innerHTML += '.tts_highlight { border-radius: 10px; background: #e6faff; }';
        style.innerHTML += '.tts_button { border: none; margin: 2px; padding: 0px; width: 36px; height: 36px; cursor: pointer; }';

        // Icons from: https://icon-sets.iconify.design/bx/
        style.innerHTML += "#tts_buttonParameters { background: url('https://api.iconify.design/bx/cog.svg?width=36&color=%23aaa') no-repeat center center / contain; }";
        style.innerHTML += "#tts_buttonBack { background: url('https://api.iconify.design/bx/skip-previous.svg?width=36') no-repeat center center / contain; }";
        style.innerHTML += "#tts_buttonPlayPause { background: url('https://api.iconify.design/bx/play.svg?width=36') no-repeat center center / contain; }";
        style.innerHTML += "#tts_buttonPlayPause.tts_pause { background: url('https://api.iconify.design/bx/pause.svg?width=36') no-repeat center center / contain; }";
        style.innerHTML += "#tts_buttonStop { background: url('https://api.iconify.design/bx/stop.svg?width=36') no-repeat center center / contain; }";
        style.innerHTML += "#tts_buttonNext { background: url('https://api.iconify.design/bx/skip-next.svg?width=36') no-repeat center center / contain; }";
        document.getElementsByTagName('head')[0].appendChild(style);

        // Make sure that the TTS is not hanging from a previous page
        tts_synthesis.cancel();
    }

    // Ensure there is content to read
    if (document.getElementsByClassName('body-content')[0].children.length > 0) {
        // Only load the element once Chrome has loaded the voices
        window.speechSynthesis.onvoiceschanged = function (e) {
            tts_setup();
        };
    }
    else {
        console.log('🗣️ No article to read on this page');
    }
})();