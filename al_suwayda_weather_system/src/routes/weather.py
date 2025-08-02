from flask import Blueprint, jsonify, current_app
import requests
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
from config import Config

weather_bp = Blueprint('weather', __name__)

@weather_bp.route('/current', methods=['GET'])
def get_current_weather():
    """جلب بيانات الطقس الحالية لمحافظة السويداء"""
    try:
        api_key = Config.OPENWEATHER_API_KEY
        if not api_key or api_key == 'YOUR_API_KEY_HERE':
            return jsonify({'error': 'API key not configured. Please set OPENWEATHER_API_KEY in config.py'}), 400
        
        # استخدام OpenWeatherMap API
        url = f"https://api.openweathermap.org/data/2.5/weather"
        params = {
            'lat': Config.AL_SUWAYDA_LAT,
            'lon': Config.AL_SUWAYDA_LON,
            'appid': api_key,
            'units': 'metric',
            'lang': 'ar'
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return jsonify(response.json())
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch weather data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@weather_bp.route('/forecast', methods=['GET'])
def get_weather_forecast():
    """جلب توقعات الطقس لمحافظة السويداء"""
    try:
        api_key = Config.OPENWEATHER_API_KEY
        if not api_key or api_key == 'YOUR_API_KEY_HERE':
            return jsonify({'error': 'API key not configured. Please set OPENWEATHER_API_KEY in config.py'}), 400
        
        # استخدام OpenWeatherMap 5-day forecast API
        url = f"https://api.openweathermap.org/data/2.5/forecast"
        params = {
            'lat': Config.AL_SUWAYDA_LAT,
            'lon': Config.AL_SUWAYDA_LON,
            'appid': api_key,
            'units': 'metric',
            'lang': 'ar'
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return jsonify(response.json())
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch forecast data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@weather_bp.route('/onecall', methods=['GET'])
def get_onecall_weather():
    """جلب بيانات الطقس الشاملة باستخدام One Call API"""
    try:
        api_key = Config.OPENWEATHER_API_KEY
        if not api_key or api_key == 'YOUR_API_KEY_HERE':
            return jsonify({'error': 'API key not configured. Please set OPENWEATHER_API_KEY in config.py'}), 400
        
        # استخدام OpenWeatherMap One Call API 3.0
        url = f"https://api.openweathermap.org/data/3.0/onecall"
        params = {
            'lat': Config.AL_SUWAYDA_LAT,
            'lon': Config.AL_SUWAYDA_LON,
            'appid': api_key,
            'units': 'metric',
            'lang': 'ar'
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        
        return jsonify(response.json())
    
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Failed to fetch One Call data: {str(e)}'}), 500
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

@weather_bp.route('/coordinates', methods=['GET'])
def get_coordinates():
    """إرجاع إحداثيات محافظة السويداء"""
    return jsonify({
        'latitude': Config.AL_SUWAYDA_LAT,
        'longitude': Config.AL_SUWAYDA_LON,
        'city': 'As-Suwayda',
        'country': 'Syria'
    })

@weather_bp.route('/map-layers', methods=['GET'])
def get_map_layers():
    """إرجاع طبقات الخريطة المتاحة مع API key"""
    try:
        api_key = Config.OPENWEATHER_API_KEY
        if not api_key or api_key == 'YOUR_API_KEY_HERE':
            return jsonify({'error': 'API key not configured'}), 400
            
        layers = {
            'temperature': f'https://tile.openweathermap.org/map/temp_new/{{z}}/{{x}}/{{y}}.png?appid={api_key}',
            'precipitation': f'https://tile.openweathermap.org/map/precipitation_new/{{z}}/{{x}}/{{y}}.png?appid={api_key}',
            'wind': f'https://tile.openweathermap.org/map/wind_new/{{z}}/{{x}}/{{y}}.png?appid={api_key}',
            'clouds': f'https://tile.openweathermap.org/map/clouds_new/{{z}}/{{x}}/{{y}}.png?appid={api_key}',
            'pressure': f'https://tile.openweathermap.org/map/pressure_new/{{z}}/{{x}}/{{y}}.png?appid={api_key}'
        }
        
        return jsonify(layers)
    
    except Exception as e:
        return jsonify({'error': f'Failed to get map layers: {str(e)}'}), 500

