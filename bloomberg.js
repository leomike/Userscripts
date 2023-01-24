// ==UserScript==
// @name         Bloomberg
// @description  Adjust Bloomberg page for optimal reading experience
// @version      2.20
// @match        https://www.bloomberg.com/*
// @updateURL    https://raw.githubusercontent.com/leomike/Userscripts/main/bloomberg.js
// @downloadURL  https://raw.githubusercontent.com/leomike/Userscripts/main/bloomberg.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// ==/UserScript==

(function () {
    'use strict';

    // Adjust page header
    try {
        document.getElementById('navi').style.cssText += 'top: 0px;';
        document.getElementsByClassName('navi-subscribe-link')[0].style.cssText += 'display: none;';
        document.getElementsByClassName('mini-player__42ed0bc4')[0].style.cssText += 'display: none;';
    }
    catch (e) { }

    // Expand the article
    let contentSource = document.querySelectorAll('[data-component-props$="Body"]');
    if (contentSource.length > 0) {
        document.getElementsByClassName('body-content')[0].innerHTML = JSON.parse(contentSource[0].textContent).story.body;
    }

    // Load full resolution images
    let images = document.querySelectorAll('[src$="x-1.png"], [src$="x-1.jpg"]');
    if (images.length > 0) {
        let i = 0;
        while (i < images.length) {
            let image = images[i];
            image.src = image.src.replace(/-?[0-9]+x-1\.([a-z]{3})/g, '-1x-1.$1');
            image.style.filter = 'blur(0px)';
            i++;
        }
    }

    // Remove the sidebar
    let sidebar = document.querySelectorAll('[class^="right-rail"]');
    if (sidebar.length > 0)
        sidebar[0].style.display = 'none';
    let mainColumn = document.querySelectorAll('[class^="main-column"]');
    if (mainColumn.length > 0)
        mainColumn[0].style.width = 'auto';
    let content = document.querySelectorAll('[class^="content-well"]');
    if (content.length > 0)
        content[0].style.height = 'auto';

    // Expand footnotes
    function displayFootnote(event) {
        let element = event.target;

        if (element.classList.contains('active')) {
            element.classList.remove('active');
        }
        else {
            element.classList.add('active');
            element.getBoundingClientRect();
            if (element.getBoundingClientRect().x > mainColumn[0].getBoundingClientRect().x + mainColumn[0].getBoundingClientRect().width / 2) {
                element.getElementsByClassName("footnote-tooltip")[0].classList.remove('right');
                element.getElementsByClassName("footnote-tooltip")[0].classList.add('left');
            }
            else {
                element.getElementsByClassName("footnote-tooltip")[0].classList.remove('left');
                element.getElementsByClassName("footnote-tooltip")[0].classList.add('right');
            }
        }
    }

    let footnoteReferences = document.querySelectorAll('[id^="footnote-"][id$="ref"]');
    for (var footnoteReference of footnoteReferences) {
        let footnoteId = footnoteReference.id.split('-')[1];
        let footnote = document.querySelectorAll('[id="footnote-' + footnoteId + '"]')[0].parentNode.querySelectorAll('p')[0];
        let footnoteHTML = footnote.innerHTML;
        let footnoteTooltip = document.createElement('span');
        footnoteTooltip.innerHTML = footnoteHTML;
        footnoteTooltip.classList.add('footnote-tooltip');
        footnoteReference.parentNode.appendChild(footnoteTooltip, null);
        footnoteReference.parentNode.href = 'javascript:void(0)';
        footnoteReference.parentNode.onclick = displayFootnote;
    }

    // Add footnotes styling
    if (footnoteReferences.length > 0) {
        let style = document.createElement('style');
        style.textContent = '.footnote-tooltip { display: none; width: 300px; background-color: white; color: black; padding: 10px; border: 1px solid black; border-radius: 10px; position: absolute; z-index: 1; top: 20px; text-align: left; }';
        style.textContent += '.footnote-tooltip.left { right: 10px; }';
        style.textContent += '.footnote-tooltip.right { left: 10px; }';
        style.textContent += '.active .footnote-tooltip { display: block; }';
        style.textContent += '.footnote-tooltip a { display: inline !important; }';
        document.head.appendChild(style);
    }

    // Change links to external websites with paywalls
    let ftLinks = document.querySelectorAll('a[href^="https://www.ft.com"]');
    for (var i = 0; i < ftLinks.length; i++) {
        ftLinks[i].href = 'https://12ft.io/proxy?q=' + encodeURIComponent(ftLinks[i].href);
    }
    let archiveLinks = document.querySelectorAll('a[href^="https://www.wsj.com"]');
    for (var i = 0; i < archiveLinks.length; i++) {
        archiveLinks[i].href = 'https://archive.is/latest/' + archiveLinks[i].href;
    }

    // Store back the modified article in the JSON element
    var JSON_string = JSON.parse(contentSource[0].textContent);
    JSON_string.story.body = document.getElementsByClassName('body-content')[0].innerHTML;
    contentSource[0].textContent = JSON.stringify(JSON_string);

    // Hide the overlay once shown
    function hideOverlay(callCount) {
        let overlays = document.querySelectorAll('[class*="nearly-transparent-text-blur"]');
        let updateInterval = 10;
        if (overlays.length > 0) {
            let overlay = overlays[0];
            overlay.className = overlay.className.replace(/ ?nearly-transparent-text-blur[_A-Za-z0-9]+/g, '');
        }
        else if (callCount < 10000 / updateInterval) {
            window.setTimeout(function () { hideOverlay(callCount + 1); }, updateInterval);
        }
    }
    hideOverlay(0);
})();