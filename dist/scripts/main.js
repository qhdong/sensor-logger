"use strict";$(function(){function n(n){var e=n.length;$("#pin-total").text(e);var o=n.pop(),t=0;$("#pin").text(o),$("#pin-input").bind("GET_PIN",function(a){a.target.value!=o?(a.target.value="",$("#pin-form").addClass("has-error"),$(".form-control-feedback").removeClass("hidden"),p.emit("rollback",{pin:o,sampleID:u.sampleID}),r(),console.log("Wrong PIN! Send rollback message! Remove sensor listener")):(a.target.value="",$("#pin-form").removeClass("has-error"),$(".form-control-feedback").addClass("hidden"),o=n.pop(),t+=1,$("#pin-progress").css("width",t/e*100+"%"),$("#pin").text(o),$("#pin-count").text(t),t==e&&($("#pin-input").attr("disabled","disabled").unbind("GET_PIN"),$("#overModal").modal("show"),$("#enter-again-btn").click(function(n){window.location.reload()})))})}function e(){i(),o(),$("#pin-input").keyup(function(n){4==n.target.value.length&&$("#pin-input").trigger("GET_PIN",n)})}function o(){$("#startupModal").modal("show").on("hide.bs.modal",function(n){var e=$("#username").val();""!=e&&(u.username=e)})}function t(n){return new Promise(function(e,o){$.ajax({method:"GET",url:n,dataType:"jsonp"}).done(function(n){var o=a(n.pins);e(o)})})}function a(n){for(var e=1;e<n.length;e++){var o=Math.floor(Math.random()*(e+1)),t=n[e];n[e]=n[o],n[o]=t}return n}function i(){window.DeviceMotionEvent&&window.DeviceOrientationEvent?$("#pin-input").bind("focus",function(){c()}).bind("blur",function(){r()}):$("#browser-alert").removeClass("hidden")}function r(){window.removeEventListener("devicemotion",s,!1),window.removeEventListener("deviceorientation",d,!1)}function c(){window.addEventListener("devicemotion",s,!1),window.addEventListener("deviceorientation",d,!1)}function l(n){p.emit("sensor",{username:u.username,sampleID:u.sampleID,pin:$("#pin").text(),time:new Date,data:n})}function s(n){var e=n.acceleration,o=n.accelerationIncludingGravity,t=n.rotationRate,a=n.interval,i={"acc-x":e.x,"acc-y":e.y,"acc-z":e.z,"gacc-x":o.x,"gacc-y":o.y,"gacc-z":o.z,"rot-alpha":t.alpha,"rot-beta":t.beta,"rot-gamma":t.gamma,interval:a};l(i)}function d(n){var e={"ox-gamma":n.gamma,"oy-beta":n.beta,"oz-alpha":n.alpha};l(e)}var u={pinURL:"http://115.159.83.89:8080/pin",serverURL:"http://115.159.83.89:8080",username:"Anonymous",sampleID:(new Date).getTime()},p=io.connect(u.serverURL);p.on("connect_error",function(){console.error("can not connect to server")}),p.on("rollback-complete",function(){c(),console.log("Receive Message: rollback complete! Add sensor listener")}),t(u.pinURL).then(function(o){e(),console.log(o),n(o)})});