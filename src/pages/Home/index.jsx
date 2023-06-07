import { createElement, useEffect, useState } from 'rax';
import View from 'rax-view';
import Text from 'rax-text';

import { getInfo, getInfoSync } from '@uni/system-info';


import styles from './index.module.scss';
// Zebra Bluetooth LE services and characteristics UUIDs
const ZPRINTER_DIS_SERVICE_UUID = '0000180A-0000-1000-8000-00805F9B34FB'; // Or "180A". Device Information Services UUID
// 固定服务ID
const ZPRINTER_SERVICE_UUID = '38EB4A80-C570-11E3-9507-0002A5D5C51B'; // Zebra Bluetooth LE Parser Service
const READ_FROM_ZPRINTER_CHARACTERISTIC_UUID = '38EB4A81-C570-11E3-9507-0002A5D5C51B'; // Read from printer characteristic
const WRITE_TO_ZPRINTER_CHARACTERISTIC_UUID = '38EB4A82-C570-11E3-9507-0002A5D5C51B'; // Write to printer characteristic
const _deviceList = [];

function grayPixle(pix) {
  return pix[0] * 0.299 + pix[1] * 0.587 + pix[2] * 0.114;
}

function Bluetooth() {
  const [deviceList, setDeviceList] = useState([]);

  // 初始化蓝牙接口
  function initBluetoothAdapter() {
    return new Promise((resolve, reject) => {
      dd.openBluetoothAdapter({
        success: (res) => {
          resolve(res);
        },
        fail: (res) => {
          reject(res);
        },
        complete: (res) => {
          console.log('initBluetoothAdapter', res);
        },
      });
    });
  }
  // 事件监听
  function initChangeListener() {
    dd.onBluetoothAdapterStateChange({
      success: (res) => {
        console.log('initChangeListener', res);
      },
      fail: (res) => {
        console.log('initChangeListener', res);
      },
      complete: (res) => {
        console.log('initChangeListener', res);
      },
    });
    dd.onBluetoothDeviceFound({
      success: (res) => {
        // console.log('onBluetoothDeviceFound', res?.devices[0]);
        _deviceList.push(res?.devices[0]);
        // console.log('_deviceList', _deviceList);
        if (res?.devices[0].deviceName?.includes('JJKY')) {
          console.log('print device', res?.devices[0]);
          setDeviceList([].concat(deviceList, res?.devices[0]));
        }
      },
      fail: (res) => {
        console.log('onBluetoothDeviceFound', res);
      },
      complete: (res) => {
        // console.log('onBluetoothDeviceFound', res);
      },
    });
    dd.onBLEConnectionStateChanged({
      success: (res) => {
        console.log('onBLEConnectionStateChanged', res);
      },
      fail: (res) => {
        console.log('onBLEConnectionStateChanged', res);
      },
      complete: (res) => {
        console.log('onBLEConnectionStateChanged', res);
      },
    });
  }

  // 搜索设备
  function startDiscovery() {
    dd.startBluetoothDevicesDiscovery({
      success: (res) => {
        console.log('startBluetoothDevicesDiscovery', res);
      },
      fail: (res) => {
        console.log('startBluetoothDevicesDiscovery', res);
      },
      complete: (res) => {
        console.log('startBluetoothDevicesDiscovery', res);
      },
    });
  }

  // 连接设备
  function connectDevice() {
    dd.connectBLEDevice({
      deviceId: deviceList[0].deviceId,
      success: (res) => {
        console.log('connectBLEDevice', res);
      },
      fail: (res) => {
        console.log('connectBLEDevice fail', res);
      },
      complete: (res) => {
        console.log('connectBLEDevice', res);
      },
    });
  }

  // 获取服务
  function getBLEDeviceServices() {
    dd.getBLEDeviceServices({
      deviceId: deviceList[0].deviceId,
      success: (res) => {
        console.log(res);
      },
      fail: (res) => {
      },
      complete: (res) => {
      },
    });
  }

  // 获取特征值
  function getBLEDeviceCharacteristics() {
    dd.getBLEDeviceCharacteristics({
      deviceId: deviceList[0].deviceId,
      serviceId: ZPRINTER_SERVICE_UUID,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics', res);
      },
      fail: (res) => {
        console.log('getBLEDeviceCharacteristics', res);
      },
      complete: (res) => {
        console.log('getBLEDeviceCharacteristics', res);
      },
    });
  }



  // 发送数据
  function sendDataToDevice(options) {
    console.log('[]options', options);
    const { byteLength } = options.value;
    // 这里默认一次20个字节发送
    const speed = options.onceByleLength || 20;
    console.log(options.value.slice(0, byteLength > speed ? speed : byteLength));
    if (byteLength > 0) {
      dd.writeBLECharacteristicValue({
        deviceId: deviceList[0].deviceId,
        serviceId: ZPRINTER_SERVICE_UUID,
        characteristicId: WRITE_TO_ZPRINTER_CHARACTERISTIC_UUID,
        value: buf2hex(options.value.slice(0, byteLength > speed ? speed : byteLength)),
        success(res) {
          if (byteLength > speed) {
            sendDataToDevice({
              ...options,
              value: options.value.slice(speed, byteLength),
            });
          } else {
            options.lasterSuccess && options.lasterSuccess();
          }
        },
        fail(res) {
          console.log('ssi - Failed to send ZPL to printer:', res);
        },
        complete: (res) => {
          console.log('[write res==>]', res);
        },
      });
    }
  }

  function stringToHex(str) {
    if (str === '') { return ''; }
    const hexCharCode = [];
    hexCharCode.push('0x');
    for (let i = 0; i < str.length; i++) {
      hexCharCode.push((str.charCodeAt(i)).toString(16));
    }
    return hexCharCode.join('');
  }

  // 数据转换
  function buf2hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), (x) => (`00${x.toString(16)}`).slice(-2)).join('');
  }

  // 写入值
  async function writeStringToPrinter(str) {
    const sysInfo = getInfoSync();
    const that = this;


    let maxChunk = 20; // Default is 20 bytes per write to characteristic

    if (sysInfo?.platform?.toLowerCase() === 'ios') {
      maxChunk = 300; // 300 bytes per write to characteristic works for iOS
    } else if (sysInfo?.platform?.toLowerCase() === 'android') {
      maxChunk = 19; // Adjusting for Android
    }

    console.log('str', str, maxChunk, str.length);
    if (str.length <= maxChunk) {
      writeStrToCharacteristic(str);
    } else {
      // Need to partion the string and write one chunk at a time.
      let j = 0;
      for (let i = 0; i < str.length; i += maxChunk) {
        let subStr = '';
        if (i + maxChunk <= str.length) {
          subStr = str.substring(i, i + maxChunk);
        } else {
          subStr = str.substring(i, str.length);
        }
        console.log('[setTimeout]', subStr);
        if (sysInfo?.platform?.toLowerCase() === 'ios') {
          writeStrToCharacteristic(subStr); // iOS doesn't need the delay during each write
        } else {
          // Android needs delay during each write.
          console.log('350 * j', 350 * j, subStr);
          setTimeout(() => writeStrToCharacteristic(subStr), 200 * j); // Adjust the delay if needed
          j++;
        }
      }
    }

    function writeStrToCharacteristic(str) {
      // Convert str to ArrayBuff and write to printer
      console.log('[str]', str);
      let buffer = new ArrayBuffer(str.length);
      const dataView = new DataView(buffer);
      for (let i = 0; i < str.length; i++) {
        sysInfo?.platform?.toLowerCase() === 'ios' && dataView.setUint8(i, str.charAt(i).charCodeAt());
        // sysInfo?.platform?.toLowerCase() === 'android' && dataView.setUint8(i, str.charAt(i).charCodeAt().toString(16));
      }

      if (sysInfo?.platform?.toLowerCase() === 'android') {
        buffer = stringToHex(str);
        console.log('buffer-->', buffer);
      }

      // Write buffer to printer
      dd.writeBLECharacteristicValue({
        deviceId: deviceList[0].deviceId,
        serviceId: ZPRINTER_SERVICE_UUID,
        characteristicId: WRITE_TO_ZPRINTER_CHARACTERISTIC_UUID,
        value: buffer,
        success(res) {
          dd.showToast({
            type: 'success',
            content: 'Sent ZPL to printer successfully',
            duration: 1000,
          });
        },
        fail(res) {
          console.log('ssi - Failed to send ZPL to printer:', res);
          dd.showToast({
            type: 'fail',
            content: 'Sent ZPL to printer successfully',
            duration: 1000,
          });
        },
        complete: (res) => {
          console.log('[write res==>]', res);
        },
      });
    }
  }

  useEffect(() => {
    async function init() {
      await initBluetoothAdapter();
      initChangeListener();
    }
    init();
  }, []);

  useEffect(() => {
    console.log(_deviceList);
  }, [_deviceList]);

  console.log(_deviceList);

  return (
    <View className={styles.bluetooth}>
      <Text>
        设备列表
      </Text>
      {
        deviceList.map((item, index) => {
          return (
            <Text key={index}>{JSON.stringify(item)}</Text>
          );
        })
      }
      <Text style={{ marginTop: 40 }} onClick={startDiscovery}>搜索设备</Text>
      <Text style={{ marginTop: 40 }} onClick={connectDevice}>连接设备</Text>
      <Text style={{ marginTop: 40 }} onClick={getBLEDeviceServices}>获取服务</Text>
      <Text style={{ marginTop: 40 }} onClick={getBLEDeviceCharacteristics}>获取特征值</Text>
      <Text
        style={{ marginTop: 40 }}
        onClick={() => {
          writeStringToPrinter(
            '! 0 200 200 450 1\r\n' +
            'COUNTRY CHINA\r\n' +
            'SPEED 4\r\n' +
            'BARCODE-TEXT 7 0 5\r\n' +
            'BARCODE 128 1 1 50 0 20 250123456789\r\n' +
            'BARCODE-TEXT OFF\r\n' +
            'PRINT\r\n',
          );
        }}
      >写入值测试
      </Text>
      <canvas canvas-id="canvasId" id="canvasId" className="pay-code" />
    </View >
  );
}

export default Bluetooth;
