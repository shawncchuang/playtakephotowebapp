document.addEventListener('DOMContentLoaded', async () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');
    const startButton = document.getElementById('startCamera');
    const switchButton = document.getElementById('switchCamera');
    const takePhotoButton = document.getElementById('takePhoto');
    const savePhotoButton = document.getElementById('savePhoto');
    const controls = document.querySelector('.controls');

    let stream = null;
    let cameraSettings = null;
    let actualResolution = null;
    let screenResolution = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    let currentFacingMode = 'environment';
    let availableCameras = [];

    // 設置控制按鈕樣式
    function setupControlsStyle() {
        if (controls) {
            controls.style.position = 'fixed';
            controls.style.bottom = '20px';
            controls.style.left = '0';
            controls.style.right = '0';
            controls.style.zIndex = '9999';
            controls.style.display = 'flex';
            controls.style.justifyContent = 'space-between';
            controls.style.gap = '10px';
            controls.style.padding = '10px';
            controls.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
            controls.style.backdropFilter = 'blur(10px)';
            controls.style.webkitBackdropFilter = 'blur(10px)';
            controls.style.transform = 'translateZ(0)';
            controls.style.webkitTransform = 'translateZ(0)';
            controls.style.width = '100%';
            controls.style.maxWidth = '100vw';
            controls.style.boxSizing = 'border-box';

            // 適配 iOS 安全區域
            if (isIOS) {
                controls.style.paddingBottom = 'max(15px, env(safe-area-inset-bottom))';
            }

            // 根據屏幕寬度調整間距
            if (window.innerWidth <= 768) {
                controls.style.gap = '8px';
                controls.style.padding = '15px';
            }
            if (window.innerWidth <= 360) {
                controls.style.gap = '6px';
                controls.style.padding = '10px';
            }
        }

        // 設置按鈕樣式
        const buttons = [startButton, switchButton, takePhotoButton, savePhotoButton];
        buttons.forEach(button => {
            if (button) {
                button.style.padding = '12px 10px';
                button.style.border = 'none';
                button.style.borderRadius = '25px';
                button.style.backgroundColor = '#007AFF';
                button.style.color = 'white';
                button.style.fontSize = 'clamp(12px, 4vw, 16px)';
                button.style.fontWeight = '600';
                button.style.cursor = 'pointer';
                button.style.transition = 'all 0.3s ease';
                button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
                button.style.webkitAppearance = 'none';
                button.style.appearance = 'none';
                button.style.position = 'relative';
                button.style.zIndex = '10000';
                button.style.webkitTapHighlightColor = 'transparent';
                button.style.whiteSpace = 'nowrap';
                button.style.overflow = 'hidden';
                button.style.textOverflow = 'ellipsis';
                button.style.flex = '1';
                button.style.textAlign = 'center';
                button.style.lineHeight = '1.2';
                button.style.minWidth = '0';
                button.style.maxWidth = 'none';

                // 根據屏幕寬度調整按鈕大小
                if (window.innerWidth <= 768) {
                    button.style.padding = '10px 8px';
                    button.style.fontSize = 'clamp(10px, 3.5vw, 14px)';
                }
                if (window.innerWidth <= 360) {
                    button.style.padding = '8px 6px';
                    button.style.fontSize = 'clamp(8px, 3vw, 12px)';
                }
            }
        });
    }

    // 檢測瀏覽器類型
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isAndroid = /Android/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    // 更新屏幕分辨率
    function updateScreenResolution() {
        screenResolution = {
            width: window.innerWidth,
            height: window.innerHeight
        };
        // 更新影片元素尺寸
        if (video) {
            video.style.width = `${screenResolution.width}px`;
            video.style.height = `${screenResolution.height}px`;
            video.style.zIndex = '1';
        }
    }

    // 監聽屏幕方向變化
    window.addEventListener('resize', updateScreenResolution);
    window.addEventListener('orientationchange', () => {
        setTimeout(updateScreenResolution, 100);
    });

    // 獲取相機實際分辨率
    async function getActualCameraResolution() {
        try {
            // 先獲取一個臨時串流來檢查實際分辨率
            const tempStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 4096 },
                    height: { ideal: 2160 }
                }
            });

            const videoTrack = tempStream.getVideoTracks()[0];
            const settings = videoTrack.getSettings();

            // 停止臨時串流
            tempStream.getTracks().forEach(track => track.stop());

            console.log('相機實際分辨率:', settings.width, 'x', settings.height);
            return {
                width: settings.width,
                height: settings.height
            };
        } catch (err) {
            console.error('獲取相機分辨率失敗:', err);
            return null;
        }
    }

    // 檢查並請求權限
    async function requestPermissions() {
        try {
            // iOS Safari 特殊處理
            if (isIOS && isSafari) {
                try {
                    // 在 iOS 上，直接請求相機權限
                    const tempStream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 4096 },
                            height: { ideal: 2160 }
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
            // 先獲取實際相機分辨率
            actualResolution = await getActualCameraResolution();
            console.log('相機實際分辨率:', actualResolution);

            // 獲取所有可用的影片輸入設備
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');

            if (videoDevices.length === 0) {
                console.log('未找到相機設備');
                return {
                    deviceId: null,
                    width: actualResolution?.width || 1920,
                    height: actualResolution?.height || 1080
                };
            }

            // 優先選擇後置相機
            let selectedDevice = videoDevices[0];
            for (const device of videoDevices) {
                if (device.label.toLowerCase().includes('back') ||
                    device.label.toLowerCase().includes('後置') ||
                    device.label.toLowerCase().includes('rear')) {
                    selectedDevice = device;
                    break;
                }
            }

            // 根據不同設備返回最佳設置
            if (isIOS && isSafari) {
                return {
                    deviceId: selectedDevice.deviceId,
                    width: actualResolution?.width || 1920,
                    height: actualResolution?.height || 1080
                };
            } else if (isAndroid) {
                return {
                    deviceId: selectedDevice.deviceId,
                    width: actualResolution?.width || 1920,
                    height: actualResolution?.height || 1080
                };
            } else {
                return {
                    deviceId: selectedDevice.deviceId,
                    width: actualResolution?.width || 1920,
                    height: actualResolution?.height || 1080
                };
            }
        } catch (err) {
            console.error('獲取相機設置失敗:', err);
            return {
                deviceId: null,
                width: actualResolution?.width || 1920,
                height: actualResolution?.height || 1080
            };
        }
    }

    // 獲取所有可用的相機
    async function getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            availableCameras = devices.filter(device => device.kind === 'videoinput');
            console.log('可用相機:', availableCameras);
            return availableCameras.length > 1;
        } catch (err) {
            console.error('獲取相機列表失敗:', err);
            return false;
        }
    }

    // 切換相機
    async function switchCamera() {
        try {
            // 停止當前串流
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            // 切換 facingMode
            currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';

            // 設置新的約束條件
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { exact: actualResolution?.width },
                    height: { exact: actualResolution?.height }
                }
            };

            // 獲取新的串流
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;

            // 等待影片加載
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve();
                };
            });

            // 播放影片
            try {
                await video.play();
            } catch (err) {
                console.error('影片播放失敗:', err);
                video.play().catch(e => console.error('舊版播放失敗:', e));
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
            console.error('切換相機失敗:', err);
            alert('切換相機失敗，請重試。');
        }
    }

    // 啟動相機
    async function startCamera() {
        try {
            // 先請求權限
            const hasPermission = await requestPermissions();
            if (!hasPermission) return;

            // 檢查是否有多個相機
            const hasMultipleCameras = await getAvailableCameras();
            switchButton.disabled = !hasMultipleCameras;

            // 獲取相機最佳設置
            cameraSettings = await getBestCameraSettings();

            // 根據不同瀏覽器設置不同的約束條件
            const constraints = {
                video: {
                    facingMode: currentFacingMode,
                    width: { exact: actualResolution?.width },
                    height: { exact: actualResolution?.height }
                }
            };

            // Android Chrome 特殊處理
            if (isAndroid) {
                constraints.video = {
                    deviceId: cameraSettings.deviceId,
                    width: { exact: actualResolution?.width },
                    height: { exact: actualResolution?.height },
                    facingMode: currentFacingMode
                };
            } else if (isIOS && isSafari) {
                constraints.video = {
                    facingMode: currentFacingMode,
                    width: { exact: actualResolution?.width },
                    height: { exact: actualResolution?.height }
                };
            }

            // 確保之前的串流已經停止
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            stream = await navigator.mediaDevices.getUserMedia(constraints);

            // 設置影片元素
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            video.setAttribute('webkit-playsinline', true);
            video.setAttribute('autoplay', true);

            // 設置影片元素樣式
            video.style.width = `${screenResolution.width}px`;
            video.style.height = `${screenResolution.height}px`;
            video.style.objectFit = 'cover';
            video.style.position = 'fixed';
            video.style.top = '0';
            video.style.left = '0';
            video.style.zIndex = '1';

            // 等待影片加載
            await new Promise((resolve) => {
                video.onloadedmetadata = () => {
                    resolve();
                };
            });

            // 播放影片
            try {
                await video.play();
            } catch (err) {
                console.error('影片播放失敗:', err);
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

    // 設置控制按鈕樣式
    setupControlsStyle();

    // 自動啟動相機
    startCamera();

    // 切換相機事件
    switchButton.addEventListener('click', switchCamera);

    // 拍照
    takePhotoButton.addEventListener('click', () => {
        // 使用相機實際分辨率
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // 使用高質量設置繪製圖片
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 確保使用實際分辨率繪製
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 將 canvas 轉換為高質量圖片
        photo.src = canvas.toDataURL('image/jpeg', 1.0);
        photo.style.display = 'block';
        photo.style.width = `${screenResolution.width}px`;
        photo.style.height = `${screenResolution.height}px`;
        photo.style.objectFit = 'cover';
        photo.style.position = 'fixed';
        photo.style.top = '0';
        photo.style.left = '0';
        photo.style.zIndex = '1';
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