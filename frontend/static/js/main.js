
// Railway Reservation & Tracking Platform - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize real-time updates
    initRealtimeUpdates();

    // Initialize Google Maps
    fetch('/api/config/maps')
        .then(res => res.json())
        .then(data => {
            if (data.apiKey) {
                initMap(data.apiKey);
            } else {
                console.error('Google Maps API key not found');
            }
        })
        .catch(err => console.error('Error loading Google Maps:', err));

    // Phone input initialization and validation
    const input = document.getElementById('passengerPhone');
    if (input) {
        phoneInput = intlTelInput.init(input, {
            initialCountry: 'in'
        });
    }
});

// Real-time updates using Socket.IO
function initRealtimeUpdates() {
    // Load Socket.IO client script dynamically if not present
    if (typeof io === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.socket.io/4.7.4/socket.io.min.js';
        script.onload = connectSocketIO;
        document.head.appendChild(script);
    } else {
        connectSocketIO();
    }
    // ...existing code...
// (all initialization code should be above this line)

function connectSocketIO() {
    // Connect to backend Socket.IO server (auto-detect host)
    let socket;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        socket = io('http://localhost:5000');
    } else {
        socket = io();
    }
    // ...existing code for socket events...

// Phone input initialization and validation
let phoneInput = null;
let otpInterval = null;

function validatePhoneNumber(number) {
    // Remove spaces and any special characters except +
    const cleanNumber = number.replace(/[^0-9+]/g, '');
    
    // Check if it's a valid phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanNumber)) {
        return {
            isValid: false,
            error: 'Please enter a valid phone number'
        };
    }

    // Validate Indian numbers (10 digits with optional +91 prefix)
    if (cleanNumber.startsWith('+91')) {
        if (cleanNumber.length !== 13) {
            return {
                isValid: false,
                error: 'Indian phone numbers must be 10 digits'
            };
        }
    }
    
    return {
        isValid: true,
        number: cleanNumber
    };
}

function startOTPTimer() {
    const otpTimer = document.getElementById('otpTimer');
    const resendOTPBtn = document.getElementById('resendOTPBtn');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    
    let timeLeft = 30;
    otpTimer.textContent = `(00:${timeLeft.toString().padStart(2, '0')})`;
    
    if (otpInterval) clearInterval(otpInterval);
    
    otpInterval = setInterval(() => {
        timeLeft--;
        otpTimer.textContent = `(00:${timeLeft.toString().padStart(2, '0')})`;
        
        if (timeLeft <= 0) {
            clearInterval(otpInterval);
            resendOTPBtn.style.display = '';
            verifyOTPBtn.style.display = 'none';
            otpTimer.textContent = '(expired)';
        }
    }, 1000);
}

async function sendOTP() {
    const phoneError = document.getElementById('phoneError');
    const sendOTPBtn = document.getElementById('sendOTPBtn');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    const otpGroup = document.querySelector('.otp-group');
    
    phoneError.style.display = 'none';
    
    if (!phoneInput) {
        phoneError.textContent = 'Phone input not initialized';
        phoneError.style.display = 'block';
        return;
    }
    
    const phoneValidation = validatePhoneNumber(phoneInput.getNumber());
    
    if (!phoneValidation.isValid) {
        phoneError.textContent = phoneValidation.error;
        phoneError.style.display = 'block';
        return;
    }

    sendOTPBtn.disabled = true;
    sendOTPBtn.textContent = 'Sending...';

    try {
        const response = await fetch('/api/passenger/send_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: phoneValidation.number
            })
        });

        const data = await response.json();

        if (response.ok) {
            otpGroup.style.display = '';
            sendOTPBtn.style.display = 'none';
            verifyOTPBtn.style.display = '';
            startOTPTimer();
            showAlert('OTP sent to your phone number', 'success');
        } else {
            phoneError.textContent = data.error || 'Failed to send OTP';
            phoneError.style.display = 'block';
            showAlert('Failed to send OTP', 'error');
        }
    } catch (err) {
        phoneError.textContent = 'Error sending OTP';
        phoneError.style.display = 'block';
        showAlert('Error sending OTP', 'error');
    } finally {
        sendOTPBtn.disabled = false;
        sendOTPBtn.textContent = 'Send OTP';
    }
}

async function verifyOTP(otp) {
    const otpError = document.getElementById('otpError');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    
    otpError.style.display = 'none';
    
    if (!phoneInput) {
        otpError.textContent = 'Phone input not initialized';
        otpError.style.display = 'block';
        return false;
    }
    
    if (!otp || otp.length !== 6 || !/^\d+$/.test(otp)) {
        otpError.textContent = 'Please enter a valid 6-digit OTP';
        otpError.style.display = 'block';
        return false;
    }

    verifyOTPBtn.disabled = true;
    verifyOTPBtn.textContent = 'Verifying...';

    try {
        const response = await fetch('/api/passenger/verify_otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                phone: phoneInput.getNumber(),
                otp: otp
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Store user session
            sessionStorage.setItem('phone', phoneInput.getNumber());
            sessionStorage.setItem('userId', data.user_id);
            sessionStorage.setItem('role', data.role);
            
            // Close login modal
            document.getElementById('loginModal').style.display = 'none';
            
            // Clear OTP timer
            if (otpInterval) clearInterval(otpInterval);
            
            showAlert('Phone number verified successfully', 'success');

            // Check for pending booking
            const pendingBooking = sessionStorage.getItem('pendingBooking');
            if (pendingBooking) {
                sessionStorage.removeItem('pendingBooking');
                const booking = JSON.parse(pendingBooking);
                bookTrain(booking.train, booking.from, booking.to, booking.date);
            }

            return true;
        } else {
            otpError.textContent = data.error || 'Invalid OTP';
            otpError.style.display = 'block';
            showAlert('Invalid OTP', 'error');
            return false;
        }
    } catch (err) {
        otpError.textContent = 'Error verifying OTP';
        otpError.style.display = 'block';
        showAlert('Error verifying OTP', 'error');
        return false;
    } finally {
        verifyOTPBtn.disabled = false;
        verifyOTPBtn.textContent = 'Verify OTP';
    }
}

// Initialize event listeners for OTP
document.addEventListener('DOMContentLoaded', function() {
    // Initialize phone input
    const input = document.getElementById('passengerPhone');
    if (input) {
        phoneInput = intlTelInput.init(input, {
            initialCountry: 'in'
        });
    }

    // OTP button event listeners
    const sendOTPBtn = document.getElementById('sendOTPBtn');
    const resendOTPBtn = document.getElementById('resendOTPBtn');
    const verifyOTPBtn = document.getElementById('verifyOTPBtn');
    const passengerLoginForm = document.getElementById('passengerLoginForm');

    if (sendOTPBtn) sendOTPBtn.addEventListener('click', sendOTP);
    if (resendOTPBtn) resendOTPBtn.addEventListener('click', sendOTP);
    if (passengerLoginForm) {
        passengerLoginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const otp = document.getElementById('passengerOTP').value.trim();
            await verifyOTP(otp);
        });
    }
});

// Train search logic (global scope)
function searchTrains(from, to, date, passengers) {
    const trainResults = document.getElementById('trainResults');
    showAlert('Searching for trains...', 'info');

    // Get trains from API
    fetch('/api/trains/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, date, passengers })
    })
    .then(res => res.json())
    .then(data => {
        const trains = data.trains || [];
        trainResults.innerHTML = '';
        if (trains.length === 0) {
            trainResults.innerHTML = '<p class="text-center">No trains available for the selected route and date.</p>';
        } else {
            trains.forEach(train => {
                const trainCard = document.createElement('div');
                trainCard.className = 'train-card';
                const totalPrice = train.price * parseInt(passengers);
                trainCard.innerHTML = `
                    <div class="train-info">
                        <h4>${train.name} (${train.id})</h4>
                        <div class="train-details">
                            <div class="train-time">
                                <div class="departure">
                                    <p class="time">${train.departure}</p>
                                    <p class="station">${train.from}</p>
                                </div>
                                <div class="duration">
                                    <p>${train.duration}</p>
                                    <div class="duration-line"></div>
                                </div>
                                <div class="arrival">
                                    <p class="time">${train.arrival}</p>
                                    <p class="station">${train.to}</p>
                                </div>
                            </div>
                            <div class="train-price">
                                <p class="price">₹${totalPrice}</p>
                                <p class="passengers">${passengers} passenger(s)</p>
                            </div>
                            <div class="train-seats">
                                <p class="seats">${train.available_seats} seats available</p>
                            </div>
                        </div>
                    </div>
                    <div class="train-actions">
                        <button class="btn btn-primary select-train" data-train-id="${train.id}" data-train-name="${train.name}" data-train-price="${totalPrice}" data-train-from="${train.from}" data-train-to="${train.to}" data-train-departure="${train.departure}" data-train-arrival="${train.arrival}">Select</button>
                        <button class="btn btn-outline-primary track-train" data-train-id="${train.id}">Track</button>
                    </div>
                `;
                trainResults.appendChild(trainCard);
                
                // Add track button event listener
                const trackBtn = trainCard.querySelector('.track-train');
                trackBtn.addEventListener('click', () => {
                    fetch(`/api/tracking/${train.id}`)
                        .then(res => res.json())
                        .then(trackingData => {
                            showTrainRoute({
                                from: train.from,
                                to: train.to,
                                progress: trackingData.progress || 0,
                                status: trackingData.status || 'Running',
                                _id: train.id
                            });
                        })
                        .catch(err => {
                            console.error('Error tracking train:', err);
                            showAlert('Could not get tracking information', 'error');
                        });
                });
            });
        }
    })
    .catch(err => {
        console.error('Error searching trains:', err);
        showAlert('Could not search for trains', 'error');
        trainResults.innerHTML = '<p class="text-center">Error searching for trains.</p>';
    });
            // Add event listeners to select buttons
            const selectButtons = trainResults.querySelectorAll('.select-train');
            selectButtons.forEach(button => {
                button.addEventListener('click', async function() {
                    let passengerEmail = sessionStorage.getItem('email');
                    if (!passengerEmail) {
                        showAlert('Please login or register to book tickets.', 'error');
                        document.getElementById('loginModal').style.display = 'block';
                        await waitForPassengerLogin();
                        passengerEmail = sessionStorage.getItem('email');
                        if (!passengerEmail) return;
                    }
                    const trainId = this.getAttribute('data-train-id');
                    const trainName = this.getAttribute('data-train-name');
                    const trainPrice = this.getAttribute('data-train-price');
                    const trainFrom = this.getAttribute('data-train-from');
                    const trainTo = this.getAttribute('data-train-to');
                    const trainDeparture = this.getAttribute('data-train-departure');
                    const trainArrival = this.getAttribute('data-train-arrival');
                    const selectedTrain = {
                        id: trainId,
                        name: trainName,
                        price: trainPrice,
                        from: trainFrom,
                        to: trainTo,
                        departure: trainDeparture,
                        arrival: trainArrival,
                        passengers: passengers,
                        passengerEmail: passengerEmail
                    };
                    sessionStorage.setItem('selectedTrain', JSON.stringify(selectedTrain));
                    const modal = document.getElementById('trainResultsModal');
                    if (modal) modal.style.display = 'none';
                    const seatModal = document.getElementById('seatSelectionModal');
                    if (seatModal) {
                        seatModal.style.display = 'block';
                        updateSeatSelectionModal(selectedTrain);
                    }
                });
            });
        }
}

function waitForPassengerLogin() {
    return new Promise(resolve => {
        const checkLogin = () => {
            if (sessionStorage.getItem('email')) {
                window.removeEventListener('storage', checkLogin);
                resolve();
            }
        };
        window.addEventListener('storage', checkLogin);
        const interval = setInterval(() => {
            if (sessionStorage.getItem('email')) {
                clearInterval(interval);
                window.removeEventListener('storage', checkLogin);
                resolve();
            }
        }, 500);
    });
}

// Update seat selection modal with selected train info
function updateSeatSelectionModal(train) {
    const modal = document.getElementById('seatSelectionModal');
    if (!modal) return;
    const trainInfo = modal.querySelector('.train-info');
    if (trainInfo) {
        trainInfo.innerHTML = `
            <h4>${train.name} (${train.id})</h4>
            <p><strong>From:</strong> ${train.from} <strong>To:</strong> ${train.to}</p>
            <p><strong>Departure:</strong> ${train.departure} <strong>Arrival:</strong> ${train.arrival}</p>
            <p><strong>Passengers:</strong> ${train.passengers} <strong>Total Price:</strong> ₹${train.price}</p>
        `;
    }
    // Fetch available coaches from backend
    const coachList = modal.querySelector('#coachList');
    coachList.innerHTML = '<option>Loading...</option>';
    fetch(`/api/trains/${train.id}/coaches`)
        .then(res => res.json())
        .then(data => {
            if (!data.coaches || data.coaches.length === 0) {
                coachList.innerHTML = '<option>No coaches available</option>';
                return;
            }
            coachList.innerHTML = '';
            data.coaches.forEach(coach => {
                const opt = document.createElement('option');
                opt.value = coach.coach_number;
                opt.textContent = `${coach.coach_number} (${coach.class || 'Class'})`;
                coachList.appendChild(opt);
            });
            // Auto-select first coach
            coachList.selectedIndex = 0;
            updateSeatMap(train.id, coachList.value);
        });
    // On coach change, update seat map
    coachList.onchange = function() {
        updateSeatMap(train.id, coachList.value);
    };
    // Reset seat selection
    resetSeatSelection();

// Initialize seat selection functionality
function initSeatSelection() {
    const seatSelectionModal = document.getElementById('seatSelectionModal');
    if (!seatSelectionModal) return;
    
    // Coach selector
    const coachButtons = seatSelectionModal.querySelectorAll('.coach-btn');
    coachButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            coachButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Update seat map based on selected coach
            const coachId = this.getAttribute('data-coach');
            updateSeatMap(coachId);
        });
    });
    
    // Initialize first coach
    if (coachButtons.length > 0) {
        coachButtons[0].click();
    }
    
    // Proceed to payment button
    const proceedBtn = seatSelectionModal.querySelector('.proceed-payment');
    if (proceedBtn) {
        proceedBtn.addEventListener('click', function() {
            const selectedSeats = getSelectedSeats();
            
            if (selectedSeats.length === 0) {
                showAlert('Please select at least one seat', 'error');
                return;
            }
            
            // Store selected seats in session storage
            sessionStorage.setItem('selectedSeats', JSON.stringify(selectedSeats));
            
            // Close seat selection modal
            seatSelectionModal.style.display = 'none';
            
            // Redirect to payment page instead of showing modal
            window.location.href = 'payment.html';
        });
    }

// Update seat map based on selected coach
function updateSeatMap(coachId) {
    // Overwrite: fetch seat map from backend and render
    const seatMap = document.querySelector('.seat-map');
    if (!seatMap) return;
    seatMap.innerHTML = '<div>Loading seat map...</div>';
    // Get selected train from session storage
    const selectedTrain = JSON.parse(sessionStorage.getItem('selectedTrain') || '{}');
    fetch(`/api/trains/${selectedTrain.id}/coaches/${coachId}/seatmap`)
        .then(res => res.json())
        .then(data => {
            seatMap.innerHTML = '';
            const seat_map = data.seat_map || {};
            const totalSeats = Object.keys(seat_map).length || 40;
            for (let i = 1; i <= totalSeats; i++) {
                const seat = document.createElement('div');
                seat.className = 'seat';
                // Determine seat status
                const status = seat_map[i] || 'available';
                if (status === 'unavailable') {
                    seat.classList.add('booked');
                    seat.setAttribute('data-status', 'booked');
                } else {
                    seat.classList.add('available');
                    seat.setAttribute('data-status', 'available');
                }
                seat.setAttribute('data-seat', i);
                seat.setAttribute('data-coach', coachId);
                seat.textContent = i;
                if (status !== 'unavailable') {
                    seat.addEventListener('click', async function() {
                        // Lock seat via backend
                        const lockRes = await fetch('/api/bookings/lock', {
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                                train_id: selectedTrain.id,
                                coach_number: coachId,
                                seat_number: i
                            })
                        });
                        if (lockRes.ok) {
                            toggleSeatSelection(this);
                        } else {
                            const data = await lockRes.json().catch(()=>({error:'Seat lock failed'}));
                            showAlert(data.error || 'Seat lock failed', 'error');
                            this.classList.add('booked');
                            this.setAttribute('data-status','booked');
                        }
                    });
                }
                seatMap.appendChild(seat);
            }
        });
}

// Toggle seat selection
function toggleSeatSelection(seat) {
    // Check if seat is available
    if (seat.getAttribute('data-status') === 'booked') return;
    
    // Toggle selected class
    seat.classList.toggle('selected');
    
    // Update selected seats display
    updateSelectedSeatsDisplay();
}

// Update selected seats display
function updateSelectedSeatsDisplay() {
    const selectedSeatsContainer = document.querySelector('.seat-list');
    const totalPriceElement = document.querySelector('.seat-summary .total-price');
    
    if (!selectedSeatsContainer || !totalPriceElement) return;
    
    // Clear previous selection
    selectedSeatsContainer.innerHTML = '';
    
    // Get all selected seats
    const selectedSeats = getSelectedSeats();
    
    // Update selected seats display
    selectedSeats.forEach(seat => {
        const seatTag = document.createElement('div');
        seatTag.className = 'seat-tag';
        seatTag.innerHTML = `Coach ${seat.coach} - Seat ${seat.seat} <i class="fas fa-times" data-coach="${seat.coach}" data-seat="${seat.seat}"></i>`;
        
        // Add remove event
        const removeIcon = seatTag.querySelector('i');
        removeIcon.addEventListener('click', function() {
            const coach = this.getAttribute('data-coach');
            const seatNum = this.getAttribute('data-seat');
            
            // Find and deselect the seat
            const seatElement = document.querySelector(`.seat[data-coach="${coach}"][data-seat="${seatNum}"]`);
            if (seatElement) {
                seatElement.classList.remove('selected');
            }
            
            // Update display
            updateSelectedSeatsDisplay();
        });
        
        selectedSeatsContainer.appendChild(seatTag);
    });
    
    // Get selected train from session storage
    const selectedTrain = JSON.parse(sessionStorage.getItem('selectedTrain') || '{}');
    const basePrice = selectedTrain.price ? parseInt(selectedTrain.price) : 0;
    
    // Calculate total price (base price per passenger + seat reservation fee)
    const seatPrice = 50; // Seat reservation fee per seat
    const totalPrice = basePrice + (selectedSeats.length * seatPrice);
    
    // Update total price
    totalPriceElement.textContent = `₹${totalPrice}`;
    
    // Store updated price in session storage
    if (selectedTrain) {
        selectedTrain.totalPrice = totalPrice;
        sessionStorage.setItem('selectedTrain', JSON.stringify(selectedTrain));
    }
}

// Get selected seats
function getSelectedSeats() {
    const selectedSeats = [];
    const seatElements = document.querySelectorAll('.seat.selected');
    
    seatElements.forEach(seat => {
        selectedSeats.push({
            coach: seat.getAttribute('data-coach'),
            seat: seat.getAttribute('data-seat')
        });
    });
    
    return selectedSeats;
}

// Reset seat selection
function resetSeatSelection() {
    const selectedSeats = document.querySelectorAll('.seat.selected');
    selectedSeats.forEach(seat => {
        seat.classList.remove('selected');
    });
    
    // Update selected seats display
    updateSelectedSeatsDisplay();
}

// Initialize payment options
function initPaymentOptions() {
    const paymentOptions = document.querySelectorAll('.payment-option');
    
    paymentOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove active class from all options
            paymentOptions.forEach(opt => opt.classList.remove('active'));
            
            // Add active class to clicked option
            this.classList.add('active');
            
            // Show/hide card details based on selected option
            const paymentMethod = this.getAttribute('data-payment');
            const cardDetails = document.querySelector('.card-details');
            
            if (cardDetails) {
                if (paymentMethod === 'card') {
                    cardDetails.style.display = 'block';
                } else {
                    cardDetails.style.display = 'none';
                }
            }
        });
    });
    
    // Initialize first payment option
    if (paymentOptions.length > 0) {
        paymentOptions[0].click();
    }
    
    // Complete payment button
    const completePaymentBtn = document.querySelector('.complete-payment');
    if (completePaymentBtn) {
        completePaymentBtn.addEventListener('click', function() {
            // Get selected payment method
            const selectedPayment = document.querySelector('.payment-option.active');
            if (!selectedPayment) {
                showAlert('Please select a payment method', 'error');
                return;
            }
            
            const paymentMethod = selectedPayment.getAttribute('data-payment');
            
            // Validate card details if card payment is selected
            if (paymentMethod === 'card') {
                const cardNumber = document.querySelector('[name="card_number"]').value;
                const cardName = document.querySelector('[name="card_name"]').value;
                const cardExpiry = document.querySelector('[name="card_expiry"]').value;
                const cardCvv = document.querySelector('[name="card_cvv"]').value;
                
                if (!cardNumber || !cardName || !cardExpiry || !cardCvv) {
                    showAlert('Please fill in all card details', 'error');
                    return;
                }
            }
            
            // Simulate payment processing
            processPayment(paymentMethod);
        });
    }
}

// Update payment modal with booking summary
function updatePaymentModal() {
    const bookingSummary = document.querySelector('.booking-summary');
    if (!bookingSummary) return;
    
    // Get selected train and seats from session storage
    const selectedTrain = JSON.parse(sessionStorage.getItem('selectedTrain') || '{}');
    const selectedSeats = JSON.parse(sessionStorage.getItem('selectedSeats') || '[]');
    
    // Calculate prices
    const basePrice = selectedTrain.price ? parseInt(selectedTrain.price) : 0;
    const seatPrice = 50 * selectedSeats.length; // Seat reservation fee
    const totalPrice = basePrice + seatPrice;
    
    // Update booking summary
    bookingSummary.innerHTML = `
        <h4>Booking Summary</h4>
        <div class="summary-item">
            <span>Train Fare (${selectedTrain.passengers} passenger(s))</span>
            <span>₹${basePrice}</span>
        </div>
        <div class="summary-item">
            <span>Seat Reservation (${selectedSeats.length} seat(s))</span>
            <span>₹${seatPrice}</span>
        </div>
        <div class="summary-item">
            <span>Total</span>
            <span>₹${totalPrice}</span>
        </div>
    `;
    
    // Update train in session storage with total price
    selectedTrain.totalPrice = totalPrice;
    sessionStorage.setItem('selectedTrain', JSON.stringify(selectedTrain));
}

// Process payment
function processPayment(paymentMethod) {
    // Show loading state
    showAlert('Processing payment...', 'info');
    // Get selected train, seats, and user
    const selectedTrain = JSON.parse(sessionStorage.getItem('selectedTrain') || '{}');
    const selectedSeats = JSON.parse(sessionStorage.getItem('selectedSeats') || '[]');
    const passengerEmail = selectedTrain.passengerEmail || sessionStorage.getItem('email');
    // Fetch user_id from backend (optional: cache in sessionStorage)
    fetch(`/api/users/by_email?email=${encodeURIComponent(passengerEmail)}`)
        .then(res => res.json())
        .then(userData => {
            const user_id = userData.user_id;
            // Prepare booking data
            const bookingData = {
                user_id: user_id,
                train_id: selectedTrain.id,
                seats: selectedSeats.map(s => `${s.coach}-${s.seat}`),
                date: selectedTrain.date,
                payment_method: paymentMethod
            };
            // POST booking to backend
            fetch('/api/bookings', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(bookingData)
            })
            .then(res => res.json())
            .then(data => {
                if (data.booking_id) {
                    // Close payment modal
                    const paymentModal = document.getElementById('paymentModal');
                    if (paymentModal) paymentModal.style.display = 'none';
                    // Store booking ID
                    sessionStorage.setItem('bookingId', data.booking_id);
                    // Show confirmation modal
                    const confirmationModal = document.getElementById('confirmationModal');
                    if (confirmationModal) {
                        confirmationModal.style.display = 'block';
                        updateConfirmationModal(data.booking_id, paymentMethod);
                    }
                } else {
                    showAlert(data.error || 'Booking failed', 'error');
                }
            })
            .catch(() => showAlert('Booking failed', 'error'));
        })
        .catch(() => showAlert('User lookup failed', 'error'));
}

// Update confirmation modal
function updateConfirmationModal(bookingId, paymentMethod) {
    const confirmationModal = document.getElementById('confirmationModal');
    if (!confirmationModal) return;
    
    // Get selected train and seats from session storage
    const selectedTrain = JSON.parse(sessionStorage.getItem('selectedTrain') || '{}');
    const selectedSeats = JSON.parse(sessionStorage.getItem('selectedSeats') || '[]');
    
    // Format seat numbers
    const seatNumbers = selectedSeats.map(seat => `Coach ${seat.coach}-${seat.seat}`).join(', ');
    
    // Get booking details container
    const bookingDetails = confirmationModal.querySelector('.booking-details');
    if (bookingDetails) {
        bookingDetails.innerHTML = `
            <h4>Booking Details</h4>
            <div class="detail-item">
                <div class="detail-label">Booking ID:</div>
                <div class="detail-value">${bookingId}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Train:</div>
                <div class="detail-value">${selectedTrain.name} (${selectedTrain.id})</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">From:</div>
                <div class="detail-value">${selectedTrain.from}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">To:</div>
                <div class="detail-value">${selectedTrain.to}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Departure:</div>
                <div class="detail-value">${selectedTrain.departure}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Arrival:</div>
                <div class="detail-value">${selectedTrain.arrival}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Passengers:</div>
                <div class="detail-value">${selectedTrain.passengers}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Seats:</div>
                <div class="detail-value">${seatNumbers}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Payment Method:</div>
                <div class="detail-value">${paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1)}</div>
            </div>
            <div class="detail-item">
                <div class="detail-label">Total Amount:</div>
                <div class="detail-value">₹${selectedTrain.totalPrice}</div>
            </div>
        `;
    }
    
    // Add download ticket button event
    const downloadBtn = confirmationModal.querySelector('.download-ticket');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', function() {
            // In a real application, this would generate and download a PDF ticket
            showAlert('Ticket download functionality would be implemented in a production environment', 'info');
        });
    }
}

// Initialize tracking form
function initTrackingForm() {
    const trackingForm = document.querySelector('.tracking-form form');
    
    if (trackingForm) {
        trackingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get tracking number
            const trackingNumber = trackingForm.querySelector('[name="tracking_number"]').value;
            
            if (!trackingNumber) {
                showAlert('Please enter a booking ID or PNR number', 'error');
                return;
            }
            
            // Simulate tracking API call
            trackBooking(trackingNumber);
        });
    }
}

// Track booking
function trackBooking(trackingNumber) {
    // Show loading state
    showAlert('Tracking your booking...', 'info');
    
    // Simulate API delay
    setTimeout(() => {
        // Mock tracking data
        const trackingData = {
            bookingId: trackingNumber,
            trainId: 'TR1001',
            trainName: 'Express 1001',
            from: 'New Delhi',
            to: 'Mumbai Central',
            departure: '08:00 AM',
            arrival: '11:30 AM',
            status: 'On Time',
            currentStation: 'Surat',
            nextStation: 'Vadodara',
            progress: 60, // Percentage of journey completed
            stations: [
                { name: 'New Delhi', time: '08:00 AM', status: 'departed' },
                { name: 'Mathura', time: '09:15 AM', status: 'departed' },
                { name: 'Kota', time: '10:30 AM', status: 'departed' },
                { name: 'Surat', time: '11:45 AM', status: 'current' },
                { name: 'Vadodara', time: '12:30 PM', status: 'upcoming' },
                { name: 'Mumbai Central', time: '01:45 PM', status: 'upcoming' }
            ]
        };
        
        // Display tracking results
        displayTrackingResults(trackingData);
    }, 1500);
}

// Display tracking results
function displayTrackingResults(data) {
    const trackingResult = document.querySelector('.tracking-result');
    if (!trackingResult) return;
    trackingResult.style.display = 'block';
    // Update train info with price and duration
    const trainInfo = trackingResult.querySelector('.train-info');
    if (trainInfo) {
        trainInfo.innerHTML = `
            <h4>${data.trainName} (${data.trainId})</h4>
            <p><strong>From:</strong> ${data.from} <strong>To:</strong> ${data.to}</p>
            <p><strong>Departure:</strong> ${data.departure} <strong>Arrival:</strong> ${data.arrival}</p>
            <p><strong>Duration:</strong> ${data.duration || '-'} <strong>Price:</strong> ₹${data.price || '-'} </p>
            <div class="train-status">
                <div class="status-indicator ${data.status === 'On Time' ? 'on-time' : data.status === 'Delayed' ? 'delayed' : 'cancelled'}"></div>
                <p>${data.status}</p>
            </div>
        `;
    }
    // Show route map (SVG or Google Static Map)
    let mapDiv = trackingResult.querySelector('.route-map');
    if (!mapDiv) {
        mapDiv = document.createElement('div');
        mapDiv.className = 'route-map';
        trackingResult.insertBefore(mapDiv, trackingResult.firstChild);
    }
    // If station coordinates available, use Google Static Map, else fallback to SVG
    if (data.stations && data.stations.length > 1 && data.stations[0].lat && data.stations[0].lng) {
        // Build Google Static Map URL
        const path = data.stations.map(s => `${s.lat},${s.lng}`).join('|');
        const markers = data.stations.map(s => `markers=color:blue%7Clabel:${s.name[0]}%7C${s.lat},${s.lng}`).join('&');
        const mapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x200&path=color:0x0000ff|weight:5|${path}&${markers}&key=YOUR_GOOGLE_MAPS_API_KEY`;
        mapDiv.innerHTML = `<img src="${mapUrl}" alt="Route Map" style="width:100%;max-width:600px;">`;
    } else {
        // Fallback: SVG route
        let svg = `<svg width="600" height="80">`;
        const n = data.stations.length;
        for (let i = 0; i < n; i++) {
            const x = 50 + i * ((500)/(n-1));
            svg += `<circle cx="${x}" cy="40" r="12" fill="#1976d2" />`;
            svg += `<text x="${x}" y="75" font-size="12" text-anchor="middle">${data.stations[i].name}</text>`;
            if (i < n-1) svg += `<line x1="${x+12}" y1="40" x2="${50 + (i+1)*((500)/(n-1))-12}" y2="40" stroke="#1976d2" stroke-width="4" />`;
        }
        svg += `</svg>`;
        mapDiv.innerHTML = svg;
    }
    // Update train progress
    const progressFill = trackingResult.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = `${data.progress || 0}%`;
    }
    // Update stations
    const stations = trackingResult.querySelector('.stations');
    if (stations) {
        stations.innerHTML = '';
        data.stations.forEach(station => {
            const stationElement = document.createElement('div');
            stationElement.className = `station ${station.status === 'departed' ? 'passed' : station.status === 'current' ? 'current' : ''}`;
            stationElement.innerHTML = `
                <p>${station.name}</p>
                <p>${station.time}</p>
            `;
            stations.appendChild(stationElement);
        });
    }
}

// Initialize booking form
function initBookingForm() {
    const bookingForm = document.querySelector('.booking-form');
    
    if (bookingForm) {
        bookingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const from = bookingForm.querySelector('[name="from"]').value;
            const to = bookingForm.querySelector('[name="to"]').value;
            const date = bookingForm.querySelector('[name="date"]').value;
            const passengers = bookingForm.querySelector('[name="passengers"]').value;
            
            // Validate form data
            if (!from || !to || !date || !passengers) {
                showAlert('Please fill in all fields', 'error');
                return;
            }
            
            // Simulate API call to search for trains
            searchTrains(from, to, date, passengers);
        });
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Create alert element if it doesn't exist
    let alertElement = document.querySelector('.alert-message');
    
    if (!alertElement) {
        alertElement = document.createElement('div');
        alertElement.className = 'alert-message';
        document.body.appendChild(alertElement);
        
        // Add styles
        alertElement.style.position = 'fixed';
        alertElement.style.top = '20px';
        alertElement.style.right = '20px';
        alertElement.style.padding = '15px 20px';
        alertElement.style.borderRadius = '5px';
        alertElement.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        alertElement.style.zIndex = '9999';
        alertElement.style.transition = 'all 0.3s ease';
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateY(-20px)';
    }
    
    // Set alert type
    if (type === 'error') {
        alertElement.style.backgroundColor = '#e74c3c';
        alertElement.style.color = 'white';
    } else if (type === 'success') {
        alertElement.style.backgroundColor = '#2ecc71';
        alertElement.style.color = 'white';
    } else {
        alertElement.style.backgroundColor = '#3498db';
        alertElement.style.color = 'white';
    }
    
    // Set message
    alertElement.textContent = message;
    
    // Show alert
    alertElement.style.opacity = '1';
    alertElement.style.transform = 'translateY(0)';
    
    // Hide alert after 3 seconds
    setTimeout(() => {
        alertElement.style.opacity = '0';
        alertElement.style.transform = 'translateY(-20px)';
        
        // Remove alert after animation
        setTimeout(() => {
            if (alertElement.parentNode) {
                alertElement.parentNode.removeChild(alertElement);
            }
        }, 300);
    }, 3000);
}