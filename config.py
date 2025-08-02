import os

class Config:
    # إعدادات Flask
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'asdf#FGSgvasgf$5$WGT'
    
    # إعدادات قاعدة البيانات
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///database/app.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # مفتاح OpenWeatherMap API
    # ضع مفتاح API الخاص بك هنا أو في متغير البيئة
    OPENWEATHER_API_KEY = os.environ.get('OPENWEATHER_API_KEY') or 'YOUR_API_KEY_HERE'
    
    # إحداثيات محافظة السويداء
    AL_SUWAYDA_LAT = 32.709106
    AL_SUWAYDA_LON = 36.341773

