$(function () {
  'use strict';

  let config = {
    pinURL: 'http://115.159.83.89:1918/pin',
    serverURL: 'http://115.159.83.89:1918',
    username: 'Anonymous',
    sampleID: new Date().getTime(),
    pinLength: 1
  };

  let uaparser = new UAParser();

  // 建立WebSocket，与服务端交互
  let socket = io.connect(config.serverURL);
  socket.on('connect_error', () => {
    alert('can not connect to server');
  });

  // 确认服务端已经rollback错误的PIN码数据，重新监听动作传感器
  socket.on('rollback-complete', () => {
    addSensorListener();
    console.log('Receive Message: rollback complete! Add sensor listener');
  });

  /**
   * 从服务器获取PIN码，启动整个应用程序
   */
  getPinsFromServer(config.pinURL)
    .then((pins) => {
      config.pinsCount = pins.length;
      config.pinLength = pins[0].length;
      startup();
      console.log(pins);
      getPinsFromUser(pins);
  });

  /**
   * 从用户获取输入的PIN，并负责交互
   * @param pins
   */
  function getPinsFromUser(pins) {
    const totalPins = pins.length;
    $('#pin-total').text(totalPins);

    let currentPin = pins.pop();
    let pinsCount = 0;
    // 每一个PIN都对应一个sampleID，即使输错需要撤销，也只会删除当前的PIN
    config.sampleID = new Date().getTime();
    $('#pin').text(currentPin);
    $('#pin-input').bind('GET_PIN', function (event) {
      // 当用户输错PIN时，通知服务器撤回该错误PIN码的记录
      if (event.target.value != currentPin) {
        // 在服务端rollback成功之前不监听动作数据
        removeSensorListener();

        event.target.value = '';
        $('#pin-form').addClass('has-error');
        $('.form-control-feedback').removeClass('hidden');

        // 通知服务端，rollback错误数据
        socket.emit('rollback', {
          'pin': currentPin,
          'sampleID': config.sampleID
        });
        console.log('Wrong PIN! Send rollback message! Remove sensor listener');

      } else {
        event.target.value = '';
        $('#pin-form').removeClass('has-error');
        $('.form-control-feedback').addClass('hidden');

        currentPin = pins.pop();
        pinsCount += 1;
        // 每一个PIN都对应一个sampleID，即使输错需要撤销，也只会删除当前的PIN
        config.sampleID = new Date().getTime();

        // 更新进度信息
        $('#pin-progress').css('width', pinsCount/totalPins * 100 + '%');
        $('#pin').text(currentPin);
        $('#pin-count').text(pinsCount);

        // 完成所有输入任务后的逻辑
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

    var pinInput = $('#pin-input');
    pinInput
      .attr('maxlength', config.pinLength)
      .attr('minlength', config.pinLength)
      .attr('pattern', '\d{' + config.pinLength + '}')
      .attr('placeholder', 'Enter ' + config.pinLength + ' digit PIN.');

    // 如果输完要求位数的PIN码，触发GET_PIN事件
    pinInput.keyup(event => {
      if (event.target.value.length == config.pinLength) {
        $('#pin-input').trigger('GET_PIN', event);
      }
    });
  }

  /**
   * 在启动时显示对话框，采集用户名
   */
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

