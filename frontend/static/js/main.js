// Railway Reservation & Tracking Platform - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize real-time updates
    initRealtimeUpdates();
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
}

function connectSocketIO() {
    // Connect to backend Socket.IO server (auto-detect host)
    let socket;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        socket = io('http://localhost:5000');
    } else {
        socket = io(); // Use same host/port as frontend
    }

    // Listen for coach position updates
    socket.on('coach_position_update', function(data) {
        // Show alert and update UI if needed
        showAlert(`Coach ${data.coach_number} position updated: Platform ${data.platform_number}, ${data.position_on_platform} at ${data.station} (ETA: ${data.eta})`, 'info');
        // Optionally update a live coach/platform display here
        updateCoachPositionDisplay(data);
    });

    // Listen for route deviation alerts
    socket.on('route_deviation_alert', function(data) {
        showAlert(`Route Deviation Alert: ${data.message}`, 'error');
        // Optionally update a live alert area here
        updateRouteDeviationAlertDisplay(data);
    });
}

// Update coach/platform display (implement as needed)
function updateCoachPositionDisplay(data) {
    // Example: update a div with id 'coach-position-info'
    const el = document.getElementById('coach-position-info');
    if (el) {
        el.innerHTML = `<strong>Coach ${data.coach_number}</strong> at <strong>Platform ${data.platform_number}</strong>, <em>${data.position_on_platform}</em> (${data.station}) ETA: ${data.eta}`;
    }
}

// Update route deviation alert display (implement as needed)
function updateRouteDeviationAlertDisplay(data) {
    // Example: update a div with id 'route-alert-info'
    const el = document.getElementById('route-alert-info');
    if (el) {
        el.innerHTML = `<span style="color:#e74c3c;font-weight:bold;">Route Deviation: ${data.message}</span>`;
    }
}
    // Initialize mobile menu
    initMobileMenu();
    
    // Initialize modals
    initModals();
    
    // Initialize search form
    initSearchForm();
    
    // Initialize tracking form
    initTrackingForm();
    
    // Initialize seat selection
    initSeatSelection();
    
    // Initialize payment options
    initPaymentOptions();
    
    // Initialize booking form
    initBookingForm();
});

// Mobile Menu Toggle
function initMobileMenu() {
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener('click', function() {
            navLinks.classList.toggle('active');
        });
    }
}

// Modal Functionality
function initModals() {
    // Get all modal triggers
    const modalTriggers = document.querySelectorAll('[data-modal]');
    const closeButtons = document.querySelectorAll('.close');
    
    // Add click event to all modal triggers
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', function() {
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'block';
            }
        });
    });
    
    // Add click event to all close buttons
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });
    
    // Close modal when clicking outside of modal content
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

// Search Form Functionality
function initSearchForm() {
    const searchForm = document.querySelector('.search-form');
    
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form data
            const from = searchForm.querySelector('[name="from"]').value;
            const to = searchForm.querySelector('[name="to"]').value;
            const date = searchForm.querySelector('[name="date"]').value;
            const passengers = searchForm.querySelector('[name="passengers"]').value;
            
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

// Simulate train search API call
function searchTrains(from, to, date, passengers) {
    // Show loading state
    showAlert('Searching for trains...', 'info');
    
    // Simulate API delay
    setTimeout(() => {
        // Mock train data
        const trains = [
            {
                id: 'TR1001',
                name: 'Express 1001',
                from: from,
                to: to,
                departure: '08:00 AM',
                arrival: '11:30 AM',
                duration: '3h 30m',
                price: 1250,
                available_seats: 42
            },
            {
                id: 'TR1002',
                name: 'Superfast 1002',
                from: from,
                to: to,
                departure: '10:15 AM',
                arrival: '01:45 PM',
                duration: '3h 30m',
                price: 1450,
                available_seats: 36
            },
            {
                id: 'TR1003',
                name: 'Intercity 1003',
                from: from,
                to: to,
                departure: '12:30 PM',
                arrival: '03:45 PM',
                duration: '3h 15m',
                price: 1150,
                available_seats: 28
            },
            {
                id: 'TR1004',
                name: 'Express 1004',
                from: from,
                to: to,
                departure: '03:00 PM',
                arrival: '06:15 PM',
                duration: '3h 15m',
                price: 1250,
                available_seats: 52
            }
        ];
        
        // Display train results
        displayTrainResults(trains, passengers);
    }, 1500);
}

// Display train search results
function displayTrainResults(trains, passengers) {
    // Create modal for train results
    let modal = document.getElementById('trainResultsModal');
    
    // If modal doesn't exist, create it
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'trainResultsModal';
        modal.className = 'modal';
        
        const modalContent = `
            <div class="modal-content">
                <span class="close">&times;</span>
                <div class="modal-header">
                    <h2>Available Trains</h2>
                </div>
                <div class="modal-body">
                    <div id="train-results"></div>
                </div>
            </div>
        `;
        
        modal.innerHTML = modalContent;
        document.body.appendChild(modal);
        
        // Add event listener to close button
        const closeBtn = modal.querySelector('.close');
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
        
        // Close modal when clicking outside of modal content
        modal.addEventListener('click', function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    }
    
    // Get train results container
    const trainResults = modal.querySelector('#train-results');
    
    // Clear previous results
    trainResults.innerHTML = '';
    
    // Check if trains are available
    if (trains.length === 0) {
        trainResults.innerHTML = '<p class="text-center">No trains available for the selected route and date.</p>';
    } else {
        // Create train cards
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
                </div>
            `;
            
            trainResults.appendChild(trainCard);
        });
        
        // Add event listeners to select buttons
        const selectButtons = trainResults.querySelectorAll('.select-train');
        selectButtons.forEach(button => {
            button.addEventListener('click', async function() {
                // Check if passenger is logged in
                let passengerEmail = sessionStorage.getItem('email');
                if (!passengerEmail) {
                    // Not logged in, show login/signup modal
                    showAlert('Please login or register to book tickets.', 'error');
                    document.getElementById('loginModal').style.display = 'block';
                    // Wait for login/signup to complete
                    await waitForPassengerLogin();
                    passengerEmail = sessionStorage.getItem('email');
                    if (!passengerEmail) return; // User closed modal or did not login
                }
                const trainId = this.getAttribute('data-train-id');
                const trainName = this.getAttribute('data-train-name');
                const trainPrice = this.getAttribute('data-train-price');
                const trainFrom = this.getAttribute('data-train-from');
                const trainTo = this.getAttribute('data-train-to');
                const trainDeparture = this.getAttribute('data-train-departure');
                const trainArrival = this.getAttribute('data-train-arrival');
                // Store selected train in session storage
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
                // Close train results modal
                modal.style.display = 'none';
                // Open seat selection modal
                const seatModal = document.getElementById('seatSelectionModal');
                if (seatModal) {
                    seatModal.style.display = 'block';
                    // Update train info in seat selection modal
                    updateSeatSelectionModal(selectedTrain);
                }
            });
        });

        // Helper: Wait for passenger login/signup
        function waitForPassengerLogin() {
            return new Promise(resolve => {
                // Listen for sessionStorage change (login/signup sets 'email')
                const checkLogin = () => {
                    if (sessionStorage.getItem('email')) {
                        window.removeEventListener('storage', checkLogin);
                        resolve();
                    }
                };
                window.addEventListener('storage', checkLogin);
                // Also poll every 500ms in case login happens in same tab
                const interval = setInterval(() => {
                    if (sessionStorage.getItem('email')) {
                        clearInterval(interval);
                        window.removeEventListener('storage', checkLogin);
                        resolve();
                    }
                }, 500);
            });
        }
    }
    
    // Show modal
    modal.style.display = 'block';
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
}

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