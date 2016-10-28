$(function () {
  'use strict';

  let config = {
    pinURL: 'http://115.159.83.89:8080/pin',
    serverURL: 'http://115.159.83.89:8080',
    username: 'Anonymous',
    sampleID: new Date().getTime()
  };

  let uaparser = new UAParser();

  let socket = io.connect(config.serverURL);
  socket.on('connect_error', () => {
    alert('can not connect to server');
  });

  socket.on('rollback-complete', () => {
    addSensorListener();
    console.log('Receive Message: rollback complete! Add sensor listener');
  });

  getPinsFromServer(config.pinURL)
    .then((pins) => {
      config.pinsCount = pins.length;
      startup();
      console.log(pins);
      getPinsFromUser(pins);
  });

  function getPinsFromUser(pins) {
    const totalPins = pins.length;
    $('#pin-total').text(totalPins);

    let currentPin = pins.pop();
    let pinsCount = 0;
    $('#pin').text(currentPin);
    $('#pin-input').bind('GET_PIN', function (event) {
      if (event.target.value != currentPin) {
        event.target.value = '';
        $('#pin-form').addClass('has-error');
        $('.form-control-feedback').removeClass('hidden');
        socket.emit('rollback', {
          'pin': currentPin,
          'sampleID': config.sampleID
        });
        removeSensorListener();
        console.log('Wrong PIN! Send rollback message! Remove sensor listener');
      } else {
        event.target.value = '';
        $('#pin-form').removeClass('has-error');
        $('.form-control-feedback').addClass('hidden');

        currentPin = pins.pop();
        pinsCount += 1;
        $('#pin-progress').css('width', pinsCount/totalPins * 100 + '%');
        $('#pin').text(currentPin);
        $('#pin-count').text(pinsCount);

        if (pinsCount == totalPins) {
          $('#pin-input').attr('disabled', 'disabled').unbind('GET_PIN');
          sendSuccessMessage();
          $('#overModal').modal('show');
          $('#enter-again-btn').click(e => {
            window.location.reload();
          });
        }
      }
    });
  }

  function startup() {
    detectBrowser();
    showStartupModel();

    $('#pin-input').keyup(event => {
      if (event.target.value.length == 4) {
        $('#pin-input').trigger('GET_PIN', event);
      }
    });
  }

  function showStartupModel() {
    $('#startupModal')
      .modal('show')
      .on('hide.bs.modal', function (e) {
        let username = $('#username').val();
        if (username != '') {
          config.username = username;
        }
      });
  }

  function sendSuccessMessage() {
    socket.emit('log-complete', {
      sampleID: config.sampleID,
      username: config.username,
      pinsCount: config.pinsCount,
      UAParser: uaparser.getResult(),
    });
  }

  /**
   * 通过Ajax从服务器获取PINS数据，使用jsonp格式
   * @param url
   * @returns {Promise} 返回pins数组
   */
  function getPinsFromServer(url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        method: 'GET',
        url: url,
        dataType: 'jsonp'
      })
        .done((data) => {
          let shuffledPins = shuffle(data.pins);
          resolve(shuffledPins);
        });
    });
  }

  /**
   * 对数组做随机置换
   * @param arr
   * @returns {*}
   */
  function shuffle(arr) {
    for (let i = 1; i < arr.length; i++) {
      let j = Math.floor(Math.random() * (i + 1));
      let tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * 检测浏览器是否支持传感器事件，并监听相应的事件
   */
  function detectBrowser() {
    if (!window.DeviceMotionEvent || !window.DeviceOrientationEvent) {
      $('#browser-alert').removeClass('hidden');
    } else {
      $('#pin-input').bind('focus', () => {
        addSensorListener();
      }).bind('blur', () => {
        removeSensorListener();
      });
    }
  }

  function removeSensorListener() {
    window.removeEventListener('devicemotion', motionHandler, false);
    window.removeEventListener('deviceorientation', orientationHandler, false);
  }

  function addSensorListener() {
    window.addEventListener('devicemotion', motionHandler, false);
    window.addEventListener('deviceorientation', orientationHandler, false);
  }

  function sendDataToServer(data) {
    socket.emit('sensor', {
      'username': config.username,
      'sampleID': config.sampleID,
      'pin': $('#pin').text(),
      'time': new Date(),
      'data': data
    });
  }

  function motionHandler(event) {
    let acc = event.acceleration;
    let gacc = event.accelerationIncludingGravity;
    let rot = event.rotationRate;
    let interval = event.interval;

    let data = {
      'acc-x': acc.x,
      'acc-y': acc.y,
      'acc-z': acc.z,
      'gacc-x': gacc.x,
      'gacc-y': gacc.y,
      'gacc-z': gacc.z,
      'rot-alpha': rot.alpha,
      'rot-beta': rot.beta,
      'rot-gamma': rot.gamma,
      'interval': interval
    };

    sendDataToServer(data);
  }

  function orientationHandler(event) {
    let data = {
      'ox-gamma': event.gamma,
      'oy-beta': event.beta,
      'oz-alpha': event.alpha
    };

    sendDataToServer(data);
  }
});

