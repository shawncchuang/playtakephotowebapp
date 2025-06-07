document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');
    const startButton = document.getElementById('startCamera');
    const takePhotoButton = document.getElementById('takePhoto');
    const savePhotoButton = document.getElementById('savePhoto');

    let stream = null;
    let cameraSettings = null;

    // 檢測瀏覽器類型
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // 檢查並請求權限
    async function requestPermissions() {
        try {
            // iOS Safari 特殊處理
            if (isIOS && isSafari) {
                try {
                    // 在 iOS 上，直接請求相機權限
                    const tempStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment'
                        }
                    });
                    // 立即停止臨時串流
                    tempStream.getTracks().forEach(track => track.stop());
                    return true;
                } catch (err) {
                    console.error('iOS 相機權限被拒絕:', err);
                    alert('請在 iOS 設置中允許 Safari 訪問相機');
                    return false;
                }
            }

            // Android Chrome 和其他瀏覽器
            const cameraPermission = await navigator.permissions.query({ name: 'camera' });
            if (cameraPermission.state === 'denied') {
                alert('請允許使用相機權限以使用此功能');
                return false;
            }

            return true;
        } catch (err) {
            console.error('權限請求失敗:', err);
            return false;
        }
    }

    // 獲取相機最佳設置
    async function getBestCameraSettings() {
        try {
            // iOS Safari 特殊處理
            if (isIOS && isSafari) {
                return {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                };
            }

            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            // 找到後置相機
            const backCamera = videoDevices.find(device =>
                device.label.toLowerCase().includes('back') ||
                device.label.toLowerCase().includes('後置') ||
                device.label.toLowerCase().includes('rear')
            ) || videoDevices[0];

            // 獲取相機能力
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    deviceId: backCamera.deviceId,
                    facingMode: 'environment'
                }
            });
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();

            // 停止臨時串流
            stream.getTracks().forEach(track => track.stop());

            return {
                deviceId: backCamera.deviceId,
                width: capabilities.width?.max || 1920,
                height: capabilities.height?.max || 1080
            };
        } catch (err) {
            console.error('獲取相機設置失敗:', err);
            return {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            };
        }
    }

    // 啟動相機
    async function startCamera() {
        try {
            // 先請求權限
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;

            // 獲取相機最佳設置
            cameraSettings = await getBestCameraSettings();

            // 根據不同瀏覽器設置不同的約束條件
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            // iOS Safari 特殊處理
            if (isIOS && isSafari) {
                constraints.video = {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                };
            } else {
                constraints.video = {
                    deviceId: cameraSettings.deviceId,
                    width: { ideal: cameraSettings.width },
                    height: { ideal: cameraSettings.height },
                    facingMode: 'environment'
                };
            }

            // 確保之前的串流已經停止
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            stream = await navigator.mediaDevices.getUserMedia(constraints);

            // 設置視頻元素
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.setAttribute('webkit-playsinline', true);
            video.setAttribute('autoplay', true);

            // 等待視頻加載
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve();
                };
            });

            // 播放視頻
            try {
                await video.play();
            } catch (err) {
                console.error('視頻播放失敗:', err);
                // 嘗試使用舊版 API
                video.play().catch(e => console.error('舊版播放失敗:', e));
            }

            startButton.disabled = true;
            takePhotoButton.disabled = false;

            // 添加全屏顯示（僅在非 iOS 設備上）
            if (!isIOS) {
                if (video.requestFullscreen) {
                    video.requestFullscreen();
                } else if (video.webkitRequestFullscreen) {
                    video.webkitRequestFullscreen();
                } else if (video.mozRequestFullScreen) {
                    video.mozRequestFullScreen();
                }
            }

            // 設置自動對焦
            const track = stream.getVideoTracks()[0];
            if (track.getCapabilities().focusMode) {
                track.applyConstraints({
                    advanced: [{
                        focusMode: 'continuous'
                    }]
                }).catch(err => console.log('自動對焦設置失敗:', err));
            }
        } catch (err) {
            console.error('無法訪問相機:', err);
            alert('無法訪問相機，請確保已授予相機權限。');
        }
    }

    // 自動啟動相機
    startCamera();

    // 拍照
    takePhotoButton.addEventListener('click', () => {
        // 使用相機實際分辨率
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 使用高質量設置繪製圖片
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0);

        // 將 canvas 轉換為高質量圖片
        photo.src = canvas.toDataURL('image/jpeg', 1.0);
        photo.style.display = 'block';
        video.style.display = 'none';

        takePhotoButton.disabled = true;
        savePhotoButton.disabled = false;
    });

    // 儲存照片
    savePhotoButton.addEventListener('click', async () => {
        try {
            // iOS Safari 特殊處理
            if (isIOS && isSafari) {
                // 創建臨時下載鏈接
                const link = document.createElement('a');
                link.download = `photo_${new Date().getTime()}.jpg`;
                link.href = photo.src;
                link.click();
            } else {
                // 檢查是否支援 File System Access API
                if ('showSaveFilePicker' in window) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: `photo_${new Date().getTime()}.jpg`,
                        types: [{
                            description: 'JPEG 圖片',
                            accept: { 'image/jpeg': ['.jpg', '.jpeg'] }
                        }]
                    });
                    const writable = await handle.createWritable();
                    const blob = await fetch(photo.src).then(r => r.blob());
                    await writable.write(blob);
                    await writable.close();
                } else {
                    // 降級方案：使用傳統下載方式
                    const link = document.createElement('a');
                    link.download = `photo_${new Date().getTime()}.jpg`;
                    link.href = photo.src;
                    link.click();
                }
            }

            // 重置介面
            photo.style.display = 'none';
            video.style.display = 'block';
            savePhotoButton.disabled = true;
            takePhotoButton.disabled = false;
        } catch (err) {
            console.error('儲存照片失敗:', err);
            alert('儲存照片失敗，請重試');
        }
    });

    // 頁面關閉時停止相機
    window.addEventListener('beforeunload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });

    // 處理頁面可見性變化
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && stream) {
            stream.getTracks().forEach(track => track.stop());
        } else if (!document.hidden && !stream) {
            startCamera();
        }
    });
}); 