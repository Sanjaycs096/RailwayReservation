
def register_routes(app, db):
    api = Blueprint('api', __name__)

    @api.route('/api/users/by_email')
    def get_user_by_email():
        email = request.args.get('email')
        if not email:
            return jsonify({'error': 'Email required'}), 400
        user = db.users.find_one({'email': email})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user_id': str(user['_id'])}), 200

from flask import Blueprint, request, jsonify
from bson import ObjectId
import json
from datetime import datetime

# Function to register all routes
def register_routes(app, db):

    # Create API blueprint FIRST so 'api' is defined before use
    api = Blueprint('api', __name__)

    # --- Passenger Phone/OTP Login ---
    from twilio.rest import Client
    from flask import current_app

    @api.route('/api/passenger/send_otp', methods=['POST'])
    def send_passenger_otp():
        data = request.get_json()
        phone = data.get('phone')
        
        if not phone:
            return jsonify({'error': 'Phone number required for OTP'}), 400
            
        try:
            # Initialize Twilio client
            account_sid = current_app.config['TWILIO_ACCOUNT_SID']
            auth_token = current_app.config['TWILIO_AUTH_TOKEN']
            verify_sid = current_app.config['TWILIO_VERIFY_SID']
            
            if not all([account_sid, auth_token, verify_sid]):
                return jsonify({'error': 'Twilio service not configured'}), 500
                
            client = Client(account_sid, auth_token)
            
            # Send verification code via Twilio Verify
            verification = client.verify \
                .v2.services(verify_sid) \
                .verifications \
                .create(to=phone, channel='sms')
                
            return jsonify({
                'message': 'OTP sent to phone number',
                'status': verification.status
            }), 200
            
        except Exception as e:
            return jsonify({'error': f'Failed to send OTP: {str(e)}'}), 500

    @api.route('/api/passenger/verify_otp', methods=['POST'])
    def verify_passenger_otp():
        data = request.get_json()
        phone = data.get('phone')
        otp = data.get('otp')
        
        if not phone or not otp:
            return jsonify({'error': 'Phone number and OTP required'}), 400
            
        try:
            # Initialize Twilio client
            account_sid = current_app.config['TWILIO_ACCOUNT_SID']
            auth_token = current_app.config['TWILIO_AUTH_TOKEN']
            verify_sid = current_app.config['TWILIO_VERIFY_SID']
            
            client = Client(account_sid, auth_token)
            
            # Verify the code
            verification_check = client.verify \
                .v2.services(verify_sid) \
                .verification_checks \
                .create(to=phone, code=otp)
                
            if verification_check.status == 'approved':
                # Find or create user
                user = db.users.find_one({'phone': phone})
                if not user:
                    user = {
                        'name': 'Passenger',
                        'phone': phone,
                        'role': 'passenger',
                        'created_at': datetime.utcnow()
                    }
                    user_id = db.users.insert_one(user).inserted_id
                else:
                    user_id = user['_id']
                
                return jsonify({
                    'message': 'Phone number verified successfully',
                    'user_id': str(user_id),
                    'role': 'passenger'
                }), 200
            else:
                return jsonify({'error': 'Invalid OTP'}), 401
                
        except Exception as e:
            return jsonify({'error': f'Failed to verify OTP: {str(e)}'}), 500

    # --- Admin: Clear All Bookings ---
    @api.route('/api/admin/bookings/clear', methods=['POST'])
    def clear_all_bookings():
        db.bookings.delete_many({})
        return jsonify({'message': 'All bookings cleared'}), 200

    # Admin: Get all bookings (with user and train info, price, distance, duration)
    @api.route('/api/bookings/all', methods=['GET'])
    def get_all_bookings():
        bookings = list(db.bookings.find())
        result = []
        for b in bookings:
            # Get user info
            user = db.users.find_one({'_id': b.get('user_id')}) if b.get('user_id') else None
            # Get train info
            train = db.trains.find_one({'_id': b.get('train_id')}) if b.get('train_id') else None
            # Calculate distance and duration if train info available
            distance = train.get('distance') if train and 'distance' in train else b.get('distance', '-')
            duration = train.get('duration') if train and 'duration' in train else b.get('duration', '-')
            # Calculate price: ₹10/km/seat as example
            num_seats = len(b['seats']) if isinstance(b.get('seats'), list) else 1
            try:
                price = int(distance) * 10 * num_seats if distance and str(distance).isdigit() else '-'
            except:
                price = '-'
            result.append({
                '_id': str(b.get('_id')),
                'user_name': user.get('name') if user else '-',
                'user_phone': user.get('phone') if user else user.get('email') if user else '-',
                'train_name': train.get('name') if train else b.get('train_name','-'),
                'from': train.get('source') if train else b.get('from','-'),
                'to': train.get('destination') if train else b.get('to','-'),
                'date': b.get('date','-'),
                'coach': b.get('coach','-'),
                'seats': b.get('seats','-'),
                'distance': distance,
                'duration': duration,
                'price': price,
                'status': b.get('status','-')
            })
        return jsonify({'bookings': result}), 200
    # Create API blueprint FIRST so 'api' is defined before use
    api = Blueprint('api', __name__)

    # --- Coach Seat Map Endpoints ---
    @api.route('/api/trains/<train_id>/coaches', methods=['GET'])
    def get_coaches(train_id):
        coaches = list(db.coaches.find({'train_id': ObjectId(train_id)}))
        return jsonify({'coaches': json.loads(json.dumps(coaches, default=str))}), 200

    @api.route('/api/trains/<train_id>/coaches/<coach_number>/seatmap', methods=['GET'])
    def get_seat_map(train_id, coach_number):
        coach = db.coaches.find_one({'train_id': ObjectId(train_id), 'coach_number': coach_number})
        if not coach:
            return jsonify({'error': 'Coach not found'}), 404
        return jsonify({'seat_map': coach.get('seat_map', {})}), 200

    @api.route('/api/trains/<train_id>/coaches/<coach_number>/seatmap', methods=['POST'])
    def update_seat_map(train_id, coach_number):
        data = request.get_json()
        seat_map = data.get('seat_map')
        if seat_map is None:
            return jsonify({'error': 'Missing seat_map'}), 400
        result = db.coaches.update_one(
            {'train_id': ObjectId(train_id), 'coach_number': coach_number},
            {'$set': {'seat_map': seat_map}}
        )
        if result.matched_count == 0:
            return jsonify({'error': 'Coach not found'}), 404
        return jsonify({'message': 'Seat map updated'}), 200

    # --- Seat Selection/Locking ---
    @api.route('/api/bookings/lock', methods=['POST'])
    def lock_seat():
        data = request.get_json()
        required_fields = ['train_id', 'coach_number', 'seat_number']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        # Lock seat (set as unavailable in seat_map)
        coach = db.coaches.find_one({'train_id': ObjectId(data['train_id']), 'coach_number': data['coach_number']})
        if not coach:
            return jsonify({'error': 'Coach not found'}), 404
        seat_map = coach.get('seat_map', {})
        if seat_map.get(data['seat_number']) == 'unavailable':
            return jsonify({'error': 'Seat already locked'}), 409
        seat_map[data['seat_number']] = 'unavailable'
        db.coaches.update_one({'_id': coach['_id']}, {'$set': {'seat_map': seat_map}})
        return jsonify({'message': 'Seat locked'}), 200

    # --- Booking Cancellation ---
    @api.route('/api/bookings/<booking_id>/cancel', methods=['POST'])
    def cancel_booking(booking_id):
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        db.bookings.update_one({'_id': ObjectId(booking_id)}, {'$set': {'status': 'cancelled'}})
        # Release seats in coach seat_map
        train_id = booking['train_id']
        for seat in booking['seats']:
            coach_number, seat_number = seat.split('-')  # e.g., 'A1-12'
            coach = db.coaches.find_one({'train_id': train_id, 'coach_number': coach_number})
            if coach:
                seat_map = coach.get('seat_map', {})
                seat_map[seat_number] = 'available'
                db.coaches.update_one({'_id': coach['_id']}, {'$set': {'seat_map': seat_map}})
        return jsonify({'message': 'Booking cancelled and seats released'}), 200

    # --- Quota Management ---
    @api.route('/api/quotas/<train_id>/<coach_number>', methods=['GET'])
    def get_quota(train_id, coach_number):
        quotas = list(db.quotas.find({'train_id': ObjectId(train_id), 'coach_number': coach_number}))
        return jsonify({'quotas': json.loads(json.dumps(quotas, default=str))}), 200

    @api.route('/api/quotas/<train_id>/<coach_number>', methods=['POST'])
    def update_quota(train_id, coach_number):
        data = request.get_json()
        required_fields = ['quota_type', 'total_seats', 'available_seats']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        db.quotas.update_one(
            {'train_id': ObjectId(train_id), 'coach_number': coach_number, 'quota_type': data['quota_type']},
            {'$set': {'total_seats': data['total_seats'], 'available_seats': data['available_seats'], 'updated_at': datetime.utcnow()}},
            upsert=True
        )
        return jsonify({'message': 'Quota updated'}), 200

    # --- Real-Time Coach Position ---
    @api.route('/api/coach_positions/<train_id>', methods=['GET'])
    def get_coach_positions(train_id):
        positions = list(db.coach_positions.find({'train_id': ObjectId(train_id)}))
        return jsonify({'positions': json.loads(json.dumps(positions, default=str))}), 200

    @api.route('/api/coach_positions/<train_id>/<coach_number>', methods=['POST'])
    def update_coach_position(train_id, coach_number):
        data = request.get_json()
        required_fields = ['platform_number', 'position_on_platform', 'station', 'eta']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        update_doc = {
            'platform_number': data['platform_number'],
            'position_on_platform': data['position_on_platform'],
            'station': data['station'],
            'eta': data['eta'],
            'updated_at': datetime.utcnow()
        }
        db.coach_positions.update_one(
            {'train_id': ObjectId(train_id), 'coach_number': coach_number},
            {'$set': update_doc},
            upsert=True
        )
        return jsonify({'message': 'Coach position updated'}), 200

    # --- Route Deviation Alerts ---
    @api.route('/api/alerts/route_deviation', methods=['POST'])
    def create_route_deviation_alert():
        data = request.get_json()
        required_fields = ['train_id', 'message']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        new_alert = {
            'train_id': ObjectId(data['train_id']),
            'message': data['message'],
            'type': 'route_deviation',
            'created_at': datetime.utcnow()
        }
        result = db.alerts.insert_one(new_alert)
        return jsonify({'message': 'Route deviation alert created', 'alert_id': str(result.inserted_id)}), 201

    
    # User routes
    @api.route('/api/users/register', methods=['POST'])
    def register_user():
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'email', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if user already exists
        if db.users.find_one({'email': data['email']}):
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create new user
        new_user = {
            'name': data['name'],
            'email': data['email'],
            'password': data['password'],  # In production, hash this password
            'role': 'passenger',  # Default role
            'created_at': datetime.utcnow()
        }
        
        result = db.users.insert_one(new_user)
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': str(result.inserted_id)
        }), 201
    
    @api.route('/api/users/login', methods=['POST'])
    def login_user():
        data = request.get_json()
        
        # Validate required fields
        if 'email' not in data or 'password' not in data:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user
        user = db.users.find_one({'email': data['email']})
        
        if not user or user['password'] != data['password']:  # In production, verify hashed password
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # In production, generate and return JWT token
        return jsonify({
            'message': 'Login successful',
            'user_id': str(user['_id']),
            'name': user['name'],
            'role': user['role']
        }), 200
    
    # Train routes
    @api.route('/api/trains', methods=['GET'])
    def get_trains():
        trains = list(db.trains.find())
        return jsonify({
            'trains': json.loads(json.dumps(trains, default=str))
        }), 200
    
    @api.route('/api/trains/<train_id>', methods=['GET'])
    def get_train(train_id):
        train = db.trains.find_one({'_id': ObjectId(train_id)})
        
        if not train:
            return jsonify({'error': 'Train not found'}), 404
        
        return jsonify({
            'train': json.loads(json.dumps(train, default=str))
        }), 200
    
    # Booking routes
    @api.route('/api/bookings', methods=['POST'])
    def create_booking():
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['user_id', 'train_id', 'seats', 'date']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Check if train exists
        train = db.trains.find_one({'_id': ObjectId(data['train_id'])})
        if not train:
            return jsonify({'error': 'Train not found'}), 404
        
        # Check if user exists
        user = db.users.find_one({'_id': ObjectId(data['user_id'])})
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Create new booking
        new_booking = {
            'user_id': ObjectId(data['user_id']),
            'train_id': ObjectId(data['train_id']),
            'train_name': train['name'],
            'seats': data['seats'],
            'date': data['date'],
            'status': 'confirmed',  # Default status
            'created_at': datetime.utcnow()
        }
        
        result = db.bookings.insert_one(new_booking)
        
        return jsonify({
            'message': 'Booking created successfully',
            'booking_id': str(result.inserted_id)
        }), 201
    
    @api.route('/api/bookings/<user_id>', methods=['GET'])
    def get_user_bookings(user_id):
        bookings = list(db.bookings.find({'user_id': ObjectId(user_id)}))
        
        return jsonify({
            'bookings': json.loads(json.dumps(bookings, default=str))
        }), 200
    
    # Train tracking routes
    @api.route('/api/tracking/<train_id>', methods=['GET'])
    def get_train_location(train_id):
        # In a real application, this would fetch real-time GPS data
        tracking_info = db.tracking.find_one({'train_id': ObjectId(train_id)})
        
        if not tracking_info:
            # Generate mock data for demo
            train = db.trains.find_one({'_id': ObjectId(train_id)})
            if not train:
                return jsonify({'error': 'Train not found'}), 404
                
            import random
            tracking_info = {
                'train_id': ObjectId(train_id),
                'status': 'Running',
                'current_station': train.get('source'),
                'next_station': train.get('destination'),
                'progress': random.randint(10, 90),  # Random progress between 10-90%
                'speed': random.randint(60, 120),  # Random speed in km/h
                'delay': random.randint(0, 30),  # Random delay 0-30 minutes
                'distance': train.get('distance', 1000),  # Default 1000km if not set
                'duration': train.get('duration', '16h 30m'),
                'updated_at': datetime.utcnow()
            }
            # Save mock data
            db.tracking.insert_one(tracking_info)
        
        # Add route points for map
        if train := db.trains.find_one({'_id': ObjectId(train_id)}):
            tracking_info['source'] = train.get('source')
            tracking_info['destination'] = train.get('destination')
            
        return jsonify({
            'tracking': json.loads(json.dumps(tracking_info, default=str))
        }), 200
    
    # Alert routes
    @api.route('/api/alerts', methods=['GET'])
    def get_alerts():
        alerts = list(db.alerts.find().sort('created_at', -1).limit(10))
        
        return jsonify({
            'alerts': json.loads(json.dumps(alerts, default=str))
        }), 200
    
    @api.route('/api/alerts/<train_id>', methods=['GET'])
    def get_train_alerts(train_id):
        alerts = list(db.alerts.find({'train_id': ObjectId(train_id)}).sort('created_at', -1))
        
        return jsonify({
            'alerts': json.loads(json.dumps(alerts, default=str))
        }), 200
    
    # Admin routes
    @api.route('/api/admin/trains', methods=['POST'])
    def add_train():
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'source', 'destination', 'departure_time', 'arrival_time', 'total_seats']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new train
        new_train = {
            'name': data['name'],
            'source': data['source'],
            'destination': data['destination'],
            'departure_time': data['departure_time'],
            'arrival_time': data['arrival_time'],
            'total_seats': data['total_seats'],
            'available_seats': data['total_seats'],  # Initially all seats are available
            'status': 'scheduled',  # Default status
            'created_at': datetime.utcnow()
        }
        
        result = db.trains.insert_one(new_train)
        
        return jsonify({
            'message': 'Train added successfully',
            'train_id': str(result.inserted_id)
        }), 201
    
    @api.route('/api/admin/alerts', methods=['POST'])
    def create_alert():
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['message', 'type']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new alert
        new_alert = {
            'message': data['message'],
            'type': data['type'],  # e.g., 'delay', 'cancellation', 'platform_change'
            'train_id': ObjectId(data['train_id']) if 'train_id' in data else None,
            'created_at': datetime.utcnow()
        }
        
        result = db.alerts.insert_one(new_alert)
        
        return jsonify({
            'message': 'Alert created successfully',
            'alert_id': str(result.inserted_id)
        }), 201
    
    # Maps API Configuration
    @api.route('/api/config/maps', methods=['GET'])
    def get_maps_config():
        from flask import current_app
        return jsonify({
            'apiKey': current_app.config.get('GOOGLE_MAPS_API_KEY')
        }), 200

    # Register blueprint with app
    app.register_blueprint(api)
    
    return api