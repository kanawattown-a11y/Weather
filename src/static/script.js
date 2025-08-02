// متغيرات عامة
let map;
let weatherLayers = {};
let mapLayerUrls = {};
let currentWeatherData = null;
let forecastData = null;
let animationInterval = null;
let currentTimeIndex = 0;
let currentMapStyle = 'osm';

// إحداثيات محافظة السويداء
const AL_SUWAYDA_COORDS = [32.7044, 36.5662];

// إعدادات طبقات الخريطة
const MAP_STYLES = {
    osm: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '© OpenStreetMap contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '© Esri'
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '© OpenTopoMap contributors'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '© CartoDB'
    }
};

// تهيئة التطبيق
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    setupEventListeners();
    loadInitialData();
});

// تهيئة الخريطة
function initializeMap() {
    // إنشاء الخريطة
    map = L.map('map', {
        center: AL_SUWAYDA_COORDS,
        zoom: 10,
        zoomControl: true,
        attributionControl: true,
        preferCanvas: true
    });

    // إضافة طبقة الخريطة الأساسية
    const baseLayer = L.tileLayer(MAP_STYLES.osm.url, {
        attribution: MAP_STYLES.osm.attribution,
        maxZoom: 18
    });
    baseLayer.addTo(map);

    // إضافة علامة لمحافظة السويداء
    const marker = L.marker(AL_SUWAYDA_COORDS, {
        icon: L.divIcon({
            className: 'custom-marker',
            html: '<div style="background: linear-gradient(135deg, #c31432, #240b36); width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(195, 20, 50, 0.4);"><i class="fas fa-map-marker-alt" style="color: white; font-size: 1.2rem;"></i></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 30]
        })
    }).addTo(map);

    marker.bindPopup(`
        <div class="popup-weather-info">
            <h4><i class="fas fa-map-marker-alt"></i> محافظة السويداء</h4>
            <p style="margin: 0.5rem 0; color: #666;">سوريا</p>
            <div id="markerWeatherInfo">
                <div style="text-align: center; padding: 1rem; color: #666;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; margin-bottom: 0.5rem;"></i>
                    <p>جاري تحميل بيانات الطقس...</p>
                </div>
            </div>
        </div>
    `);

    // إضافة مقياس المسافة
    L.control.scale({
        position: 'bottomright',
        metric: true,
        imperial: false
    }).addTo(map);

    // إضافة تحكم ملء الشاشة
    addFullscreenControl();
}

// إضافة تحكم ملء الشاشة
function addFullscreenControl() {
    const fullscreenControl = L.Control.extend({
        options: {
            position: 'topright'
        },
        onAdd: function(map) {
            const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control leaflet-control-custom');
            container.style.backgroundColor = 'white';
            container.style.width = '34px';
            container.style.height = '34px';
            container.style.cursor = 'pointer';
            container.innerHTML = '<i class="fas fa-expand" style="line-height: 34px; text-align: center; display: block; color: #333;"></i>';
            
            container.onclick = function() {
                toggleFullscreen();
            };
            
            return container;
        }
    });
    
    map.addControl(new fullscreenControl());
}

// إعداد مستمعي الأحداث
function setupEventListeners() {
    // تحديث البيانات
    document.getElementById('refreshWeather').addEventListener('click', refreshWeatherData);
    
    // عرض/إخفاء التوقعات
    document.getElementById('toggleForecast').addEventListener('click', toggleForecast);
    document.getElementById('closeForecast').addEventListener('click', closeForecast);
    
    // توسيط الخريطة
    document.getElementById('centerMap').addEventListener('click', centerMap);
    
    // ملء الشاشة
    document.getElementById('fullscreenMap').addEventListener('click', toggleFullscreen);
    
    // التحكم في طبقات الخريطة
    const layerTypes = ['temperature', 'precipitation', 'wind', 'clouds', 'pressure'];
    layerTypes.forEach(layerType => {
        const checkbox = document.getElementById(layerType + 'Layer');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => toggleWeatherLayer(layerType, e.target.checked));
        }
    });
    
    // تغيير نمط الخريطة
    document.querySelectorAll('.style-option').forEach(option => {
        option.addEventListener('click', () => {
            const style = option.dataset.style;
            changeMapStyle(style);
        });
    });
    
    // التحكم في الحركة
    document.getElementById('playAnimation').addEventListener('click', playAnimation);
    document.getElementById('pauseAnimation').addEventListener('click', pauseAnimation);
    document.getElementById('stopAnimation').addEventListener('click', stopAnimation);
    
    // شريط الوقت
    document.getElementById('timeSlider').addEventListener('input', updateTimeDisplay);
    document.getElementById('timeSlider').addEventListener('change', updateWeatherForTime);
    
    // إغلاق المفتاح
    const closeLegend = document.getElementById('closeLegend');
    if (closeLegend) {
        closeLegend.addEventListener('click', () => {
            document.getElementById('mapLegend').style.display = 'none';
        });
    }
}

// تحميل البيانات الأولية
async function loadInitialData() {
    showLoading(true);
    
    try {
        // جلب طبقات الخريطة
        await loadMapLayers();
        
        // جلب بيانات الطقس
        await refreshWeatherData();
        
        updateConnectionStatus(true);
    } catch (error) {
        console.error('خطأ في تحميل البيانات الأولية:', error);
        updateConnectionStatus(false);
        showNotification('فشل في تحميل البيانات الأولية', 'error', 'تحقق من الاتصال بالإنترنت');
    } finally {
        showLoading(false);
    }
}

// جلب طبقات الخريطة
async function loadMapLayers() {
    try {
        const response = await fetch('/api/weather/map-layers');
        if (!response.ok) {
            throw new Error('فشل في جلب طبقات الخريطة');
        }
        
        mapLayerUrls = await response.json();
    } catch (error) {
        console.error('خطأ في جلب طبقات الخريطة:', error);
        throw error;
    }
}

// تحديث بيانات الطقس
async function refreshWeatherData() {
    try {
        showNotification('جاري تحديث البيانات...', 'info', 'يرجى الانتظار');
        
        // جلب البيانات الحالية
        const currentResponse = await fetch('/api/weather/current');
        if (!currentResponse.ok) {
            const errorData = await currentResponse.json();
            throw new Error(errorData.error || 'فشل في جلب البيانات الحالية');
        }
        currentWeatherData = await currentResponse.json();
        
        // جلب التوقعات
        const forecastResponse = await fetch('/api/weather/forecast');
        if (!forecastResponse.ok) {
            const errorData = await forecastResponse.json();
            throw new Error(errorData.error || 'فشل في جلب بيانات التوقعات');
        }
        forecastData = await forecastResponse.json();
        
        // تحديث العرض
        updateCurrentWeatherDisplay();
        updateForecastDisplay();
        updateMarkerPopup();
        updateLastUpdateTime();
        
        showNotification('تم تحديث البيانات بنجاح', 'success', 'البيانات محدثة الآن');
        updateConnectionStatus(true);
        
    } catch (error) {
        console.error('خطأ في جلب البيانات:', error);
        updateConnectionStatus(false);
        showNotification('فشل في تحديث البيانات', 'error', error.message);
    }
}

// تحديث عرض الطقس الحالي
function updateCurrentWeatherDisplay() {
    if (!currentWeatherData) return;
    
    const container = document.getElementById('currentWeatherData');
    const weather = currentWeatherData;
    
    container.innerHTML = `
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-thermometer-half temp-icon weather-icon"></i>
                <span>درجة الحرارة</span>
            </div>
            <span class="weather-value">${Math.round(weather.main.temp)}°م</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-eye visibility-icon weather-icon"></i>
                <span>الشعور بالحرارة</span>
            </div>
            <span class="weather-value">${Math.round(weather.main.feels_like)}°م</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-tint humidity-icon weather-icon"></i>
                <span>الرطوبة</span>
            </div>
            <span class="weather-value">${weather.main.humidity}%</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-wind wind-icon weather-icon"></i>
                <span>الرياح</span>
            </div>
            <span class="weather-value">${Math.round(weather.wind.speed * 3.6)} كم/س</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-compress-arrows-alt pressure-icon weather-icon"></i>
                <span>الضغط الجوي</span>
            </div>
            <span class="weather-value">${weather.main.pressure} هكتوباسكال</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-cloud clouds-icon weather-icon"></i>
                <span>الغيوم</span>
            </div>
            <span class="weather-value">${weather.clouds.all}%</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-eye visibility-icon weather-icon"></i>
                <span>مدى الرؤية</span>
            </div>
            <span class="weather-value">${(weather.visibility / 1000).toFixed(1)} كم</span>
        </div>
        <div class="weather-item fade-in">
            <div class="weather-item-label">
                <i class="fas fa-info-circle weather-icon"></i>
                <span>الوصف</span>
            </div>
            <span class="weather-value">${weather.weather[0].description}</span>
        </div>
    `;
}

// تحديث عرض التوقعات
function updateForecastDisplay() {
    if (!forecastData) return;
    
    const container = document.getElementById('forecastWeatherData');
    const forecasts = forecastData.list.slice(0, 8); // أول 8 توقعات (24 ساعة)
    
    container.innerHTML = forecasts.map(forecast => {
        const date = new Date(forecast.dt * 1000);
        const time = date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const day = date.toLocaleDateString('ar-SA', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        return `
            <div class="forecast-item fade-in">
                <div class="forecast-time">${day} - ${time}</div>
                <div class="forecast-details">
                    <div class="forecast-detail">
                        <i class="fas fa-thermometer-half temp-icon"></i>
                        <span>${Math.round(forecast.main.temp)}°م</span>
                    </div>
                    <div class="forecast-detail">
                        <i class="fas fa-tint humidity-icon"></i>
                        <span>${forecast.main.humidity}%</span>
                    </div>
                    <div class="forecast-detail">
                        <i class="fas fa-wind wind-icon"></i>
                        <span>${Math.round(forecast.wind.speed * 3.6)} كم/س</span>
                    </div>
                    <div class="forecast-detail">
                        <i class="fas fa-cloud clouds-icon"></i>
                        <span>${forecast.clouds.all}%</span>
                    </div>
                </div>
                <div class="forecast-description">
                    ${forecast.weather[0].description}
                </div>
            </div>
        `;
    }).join('');
}

// تحديث نافذة العلامة المنبثقة
function updateMarkerPopup() {
    if (!currentWeatherData) return;
    
    const weather = currentWeatherData;
    const markerInfo = document.getElementById('markerWeatherInfo');
    
    if (markerInfo) {
        markerInfo.innerHTML = `
            <div class="popup-weather-details">
                <div class="popup-weather-item">
                    <i class="fas fa-thermometer-half temp-icon"></i>
                    <div class="popup-weather-value">${Math.round(weather.main.temp)}°م</div>
                </div>
                <div class="popup-weather-item">
                    <i class="fas fa-tint humidity-icon"></i>
                    <div class="popup-weather-value">${weather.main.humidity}%</div>
                </div>
                <div class="popup-weather-item">
                    <i class="fas fa-wind wind-icon"></i>
                    <div class="popup-weather-value">${Math.round(weather.wind.speed * 3.6)} كم/س</div>
                </div>
                <div class="popup-weather-item">
                    <i class="fas fa-cloud clouds-icon"></i>
                    <div class="popup-weather-value">${weather.clouds.all}%</div>
                </div>
            </div>
            <div style="margin-top: 1rem; text-align: center; font-size: 0.9rem; color: #666; font-style: italic;">
                ${weather.weather[0].description}
            </div>
        `;
    }
}

// تحديث وقت آخر تحديث
function updateLastUpdateTime() {
    const lastUpdate = document.getElementById('lastUpdate');
    if (lastUpdate) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        lastUpdate.innerHTML = `
            <i class="fas fa-clock"></i>
            <span>آخر تحديث: ${timeString}</span>
        `;
    }
}

// تحديث حالة الاتصال
function updateConnectionStatus(connected) {
    const statusIndicator = document.getElementById('connectionStatus');
    if (statusIndicator) {
        if (connected) {
            statusIndicator.className = 'status-indicator';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>متصل</span>';
        } else {
            statusIndicator.className = 'status-indicator disconnected';
            statusIndicator.innerHTML = '<i class="fas fa-circle"></i><span>غير متصل</span>';
        }
    }
}

// تبديل عرض التوقعات
function toggleForecast() {
    const forecastPanel = document.querySelector('.forecast-weather');
    const button = document.getElementById('toggleForecast');
    
    if (forecastPanel.style.display === 'none' || !forecastPanel.style.display) {
        forecastPanel.style.display = 'block';
        button.innerHTML = '<i class="fas fa-calendar-times"></i><span>إخفاء التوقعات</span>';
        forecastPanel.classList.add('slide-in');
    } else {
        forecastPanel.style.display = 'none';
        button.innerHTML = '<i class="fas fa-calendar-alt"></i><span>التوقعات</span>';
    }
}

// إغلاق التوقعات
function closeForecast() {
    const forecastPanel = document.querySelector('.forecast-weather');
    const button = document.getElementById('toggleForecast');
    
    forecastPanel.style.display = 'none';
    button.innerHTML = '<i class="fas fa-calendar-alt"></i><span>التوقعات</span>';
}

// توسيط الخريطة
function centerMap() {
    map.setView(AL_SUWAYDA_COORDS, 10);
    showNotification('تم توسيط الخريطة', 'success', 'الخريطة متوسطة على السويداء');
}

// تبديل ملء الشاشة
function toggleFullscreen() {
    const mapContainer = document.querySelector('.map-container');
    
    if (!document.fullscreenElement) {
        mapContainer.requestFullscreen().then(() => {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
            showNotification('وضع ملء الشاشة', 'info', 'اضغط ESC للخروج');
        }).catch(err => {
            showNotification('فشل في ملء الشاشة', 'error', 'المتصفح لا يدعم هذه الميزة');
        });
    } else {
        document.exitFullscreen();
    }
}

// تبديل طبقات الطقس
function toggleWeatherLayer(layerType, show) {
    if (!mapLayerUrls[layerType]) {
        showNotification('طبقة غير متاحة', 'warning', 'تحقق من إعدادات API');
        return;
    }
    
    if (show) {
        if (weatherLayers[layerType]) {
            map.removeLayer(weatherLayers[layerType]);
        }
        
        weatherLayers[layerType] = L.tileLayer(mapLayerUrls[layerType], {
            attribution: '© OpenWeatherMap',
            opacity: 0.7,
            maxZoom: 18
        });
        
        weatherLayers[layerType].addTo(map);
        showNotification(`تم تفعيل طبقة ${getLayerNameInArabic(layerType)}`, 'success');
    } else {
        if (weatherLayers[layerType]) {
            map.removeLayer(weatherLayers[layerType]);
            delete weatherLayers[layerType];
            showNotification(`تم إلغاء طبقة ${getLayerNameInArabic(layerType)}`, 'info');
        }
    }
}

// الحصول على اسم الطبقة بالعربية
function getLayerNameInArabic(layerType) {
    const names = {
        temperature: 'درجة الحرارة',
        precipitation: 'الأمطار',
        wind: 'الرياح',
        clouds: 'الغيوم',
        pressure: 'الضغط الجوي'
    };
    return names[layerType] || layerType;
}

// تغيير نمط الخريطة
function changeMapStyle(style) {
    if (!MAP_STYLES[style]) return;
    
    // تحديث الواجهة
    document.querySelectorAll('.style-option').forEach(option => {
        option.classList.remove('active');
    });
    document.querySelector(`[data-style="${style}"]`).classList.add('active');
    
    // إزالة جميع الطبقات الأساسية
    map.eachLayer(layer => {
        if (layer instanceof L.TileLayer && !layer.options.attribution.includes('OpenWeatherMap')) {
            map.removeLayer(layer);
        }
    });
    
    // إضافة الطبقة الجديدة
    const styleConfig = MAP_STYLES[style];
    const newBaseLayer = L.tileLayer(styleConfig.url, {
        attribution: styleConfig.attribution,
        maxZoom: 18
    });
    newBaseLayer.addTo(map);
    
    currentMapStyle = style;
    showNotification(`تم تغيير نمط الخريطة`, 'success', getStyleNameInArabic(style));
}

// الحصول على اسم النمط بالعربية
function getStyleNameInArabic(style) {
    const names = {
        osm: 'خريطة عادية',
        satellite: 'أقمار صناعية',
        terrain: 'التضاريس',
        dark: 'وضع مظلم'
    };
    return names[style] || style;
}

// تشغيل الحركة
function playAnimation() {
    if (!forecastData) {
        showNotification('لا توجد بيانات توقعات', 'warning', 'يرجى تحديث البيانات أولاً');
        return;
    }
    
    if (animationInterval) {
        clearInterval(animationInterval);
    }
    
    currentTimeIndex = 0;
    const slider = document.getElementById('timeSlider');
    slider.max = forecastData.list.length - 1;
    
    animationInterval = setInterval(() => {
        if (currentTimeIndex >= forecastData.list.length) {
            currentTimeIndex = 0;
        }
        
        slider.value = currentTimeIndex;
        updateTimeDisplay();
        updateWeatherForTime();
        
        currentTimeIndex++;
    }, 2000); // تغيير كل ثانيتين
    
    showNotification('تم تشغيل الحركة الزمنية', 'success', 'عرض تطور الطقس عبر الزمن');
}

// إيقاف الحركة
function pauseAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
        showNotification('تم إيقاف الحركة مؤقتاً', 'info', 'يمكنك استكمالها لاحقاً');
    }
}

// إيقاف الحركة نهائياً
function stopAnimation() {
    if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
    }
    
    currentTimeIndex = 0;
    const slider = document.getElementById('timeSlider');
    slider.value = 0;
    updateTimeDisplay();
    updateWeatherForTime();
    
    showNotification('تم إيقاف الحركة', 'info', 'تم إعادة تعيين الوقت');
}

// تحديث عرض الوقت
function updateTimeDisplay() {
    const slider = document.getElementById('timeSlider');
    const timeDisplay = document.getElementById('timeDisplay');
    
    if (forecastData && forecastData.list[slider.value]) {
        const forecast = forecastData.list[slider.value];
        const date = new Date(forecast.dt * 1000);
        const time = date.toLocaleTimeString('ar-SA', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        const day = date.toLocaleDateString('ar-SA', { 
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
        
        timeDisplay.textContent = `${day} ${time}`;
    } else {
        const hours = parseInt(slider.value);
        timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:00`;
    }
}

// تحديث الطقس للوقت المحدد
function updateWeatherForTime() {
    const slider = document.getElementById('timeSlider');
    
    if (forecastData && forecastData.list[slider.value]) {
        const forecast = forecastData.list[slider.value];
        
        // تحديث المعلومات في النافذة المنبثقة
        const markerInfo = document.getElementById('markerWeatherInfo');
        if (markerInfo) {
            markerInfo.innerHTML = `
                <div class="popup-weather-details">
                    <div class="popup-weather-item">
                        <i class="fas fa-thermometer-half temp-icon"></i>
                        <div class="popup-weather-value">${Math.round(forecast.main.temp)}°م</div>
                    </div>
                    <div class="popup-weather-item">
                        <i class="fas fa-tint humidity-icon"></i>
                        <div class="popup-weather-value">${forecast.main.humidity}%</div>
                    </div>
                    <div class="popup-weather-item">
                        <i class="fas fa-wind wind-icon"></i>
                        <div class="popup-weather-value">${Math.round(forecast.wind.speed * 3.6)} كم/س</div>
                    </div>
                    <div class="popup-weather-item">
                        <i class="fas fa-cloud clouds-icon"></i>
                        <div class="popup-weather-value">${forecast.clouds.all}%</div>
                    </div>
                </div>
                <div style="margin-top: 1rem; text-align: center; font-size: 0.9rem; color: #666; font-style: italic;">
                    ${forecast.weather[0].description}
                </div>
            `;
        }
    }
}

// عرض حالة التحميل
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    overlay.style.display = show ? 'flex' : 'none';
}

// عرض الإشعارات
function showNotification(title, type = 'info', message = '') {
    const container = document.getElementById('notificationContainer');
    
    // إنشاء عنصر الإشعار
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="${iconMap[type] || iconMap.info}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            ${message ? `<div class="notification-message">${message}</div>` : ''}
        </div>
    `;
    
    container.appendChild(notification);
    
    // إزالة الإشعار بعد 4 ثوانٍ
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

// تحديث تلقائي للبيانات كل 10 دقائق
setInterval(() => {
    if (document.visibilityState === 'visible') {
        refreshWeatherData();
    }
}, 600000); // 10 دقائق

// تحديث البيانات عند العودة للتبويب
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        // تحديث البيانات إذا مر أكثر من 5 دقائق
        const lastUpdate = localStorage.getItem('lastWeatherUpdate');
        const now = Date.now();
        
        if (!lastUpdate || (now - parseInt(lastUpdate)) > 300000) { // 5 دقائق
            refreshWeatherData();
        }
    }
});

// حفظ وقت آخر تحديث
function saveLastUpdateTime() {
    localStorage.setItem('lastWeatherUpdate', Date.now().toString());
}

// تحديث saveLastUpdateTime في refreshWeatherData
const originalRefreshWeatherData = refreshWeatherData;
refreshWeatherData = async function() {
    await originalRefreshWeatherData();
    saveLastUpdateTime();
};

