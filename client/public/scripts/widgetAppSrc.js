/**
 * Created by sojharo on 23/06/2018.
 */

(function (){
  setTimeout(function () {

    var WebRTCBrowser= true;
    if(navigator.mozGetUserMedia && window.mozRTCPeerConnection)
      WebRTCBrowser = true;
    else if (navigator.webkitGetUserMedia && !!window.chrome)
      WebRTCBrowser = true
    else
      WebRTCBrowser = false;

    var today = new Date()

    var infoPayload = {
      isWebRTCBrowser: WebRTCBrowser,
      landingTime: {
        fullDate: today,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        date: today.getDate(),
        hour: today.getHours(),
        minutes: today.getMinutes(),
        seconds: today.getSeconds()
      },
      browser: {}
    }

    var nVer = navigator.appVersion;
    var nAgt = navigator.userAgent;
    var browserName  = navigator.appName;
    var fullVersion  = ''+parseFloat(navigator.appVersion);
    var majorVersion = parseInt(navigator.appVersion,10);
    var nameOffset,verOffset,ix;

    // In Opera, the true version is after "Opera" or after "Version"
    if ((verOffset=nAgt.indexOf("Opera"))!=-1) {
      browserName = "Opera";
      fullVersion = nAgt.substring(verOffset+6);
      if ((verOffset=nAgt.indexOf("Version"))!=-1)
        fullVersion = nAgt.substring(verOffset+8);
    }
    // In MSIE, the true version is after "MSIE" in userAgent
    else if ((verOffset=nAgt.indexOf("MSIE"))!=-1) {
      browserName = "Microsoft Internet Explorer";
      fullVersion = nAgt.substring(verOffset+5);
    }
    // In Chrome, the true version is after "Chrome"
    else if ((verOffset=nAgt.indexOf("Chrome"))!=-1) {
      browserName = "Chrome";
      fullVersion = nAgt.substring(verOffset+7);
    }
    // In Safari, the true version is after "Safari" or after "Version"
    else if ((verOffset=nAgt.indexOf("Safari"))!=-1) {
      browserName = "Safari";
      fullVersion = nAgt.substring(verOffset+7);
      if ((verOffset=nAgt.indexOf("Version"))!=-1)
        fullVersion = nAgt.substring(verOffset+8);
    }
    // In Firefox, the true version is after "Firefox"
    else if ((verOffset=nAgt.indexOf("Firefox"))!=-1) {
      browserName = "Firefox";
      fullVersion = nAgt.substring(verOffset+8);
    }
    // In most other browsers, "name/version" is at the end of userAgent
    else if ( (nameOffset=nAgt.lastIndexOf(' ')+1) <
      (verOffset=nAgt.lastIndexOf('/')) )
    {
      browserName = nAgt.substring(nameOffset,verOffset);
      fullVersion = nAgt.substring(verOffset+1);
      if (browserName.toLowerCase()===browserName.toUpperCase()) {
        browserName = navigator.appName;
      }
    }
    // trim the fullVersion string at semicolon/space if present
    if ((ix=fullVersion.indexOf(";"))!=-1)
      fullVersion=fullVersion.substring(0,ix);
    if ((ix=fullVersion.indexOf(" "))!=-1)
      fullVersion=fullVersion.substring(0,ix);

    majorVersion = parseInt(''+fullVersion,10);
    if (isNaN(majorVersion)) {
      fullVersion  = ''+parseFloat(navigator.appVersion);
      majorVersion = parseInt(navigator.appVersion,10);
    }

    infoPayload.browser.browserName = browserName;
    infoPayload.browser.browserFullVersion = fullVersion;
    infoPayload.browser.browserMajorVersion = majorVersion;
    infoPayload.browser.browserAppName = navigator.appName;
    infoPayload.browser.browserUserAgent = navigator.userAgent;

    infoPayload.platform = navigator.platform;
    infoPayload.fullUrl = location.href;
    infoPayload.pathname = location.pathname;
    infoPayload.pageTitle = document.title;

    var xmlhttp = new XMLHttpRequest();
    var url = "https://localhost:3000/api/ip2country/findIp";

    xmlhttp.onreadystatechange = function() {
      if (this.readyState === 4 && this.status === 200) {
        var myRes = JSON.parse(this.responseText);
        console.log(myRes)

        infoPayload.location = myRes.payload;

        console.log(infoPayload)
      } else if (this.readyState === 4) {
        console.log(this)
      }
    };
    xmlhttp.open("POST", url, true);
    xmlhttp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    xmlhttp.send("company_id=" + window.__kibo_company_id);

  }, 3000)
})()
