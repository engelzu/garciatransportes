const GEOAPIFY_API_KEY = '3bd73ecada1d478a8c9473ad4115be38';
const SUPABASE_URL = 'https://jowsbmuqbzxukbbxbeqv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impvd3NibXVxYnp4dWtiYnhiZXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0NzA5NjQsImV4cCI6MjA3MTA0Njk2NH0.UMW2aQmuq0RiEHgody5StKEQzDjrKZnfUprDgDaMd1w';

let supabaseClient;
let driverWatchId = null;
let map;
let heatmap;
let tempDriverId = null;
let driverChart = null;
let countdownInterval = null;
let countdownSeconds = 5;
let clockInterval = null;

let state = {
    rides: [],
    drivers: [],
    users: [],
    appIcon: localStorage.getItem('appIcon') || null,
    currentDriverId: null,
    currentUserRideId: null,
    currentUserId: null,
    userStatusInterval: null,
    currentUserOrigin: null,
    currentUserDestination: null
};

let adminRingInterval = null;
let adminAudioUnlocked = false;

function unlockAdminAudio() {
    if (adminAudioUnlocked) return;

    const audio = document.getElementById('admin-ringtone');
    if (!audio) {
        console.error("❌ Elemento de áudio não encontrado!");
        return;
    }

    audio.load();
    const playPromise = audio.play();

    if (playPromise !== undefined) {
        playPromise.then(() => {
            audio.pause();
            audio.currentTime = 0;
            adminAudioUnlocked = true;
            console.log("✅ Áudio do Admin desbloqueado! Arquivo: SOM/somchamada.mp3");
            document.body.removeEventListener('click', unlockAdminAudio);
            document.body.removeEventListener('touchstart', unlockAdminAudio);
        }).catch(error => {
            console.warn("⚠️ Erro ao desbloquear áudio:", error);
        });
    }
}

document.body.addEventListener('click', unlockAdminAudio, { once: false });
document.body.addEventListener('touchstart', unlockAdminAudio, { once: false });

function playAdminRingSound() {
    const audio = document.getElementById('admin-ringtone');
    if (!audio) {
        console.error("❌ Elemento de áudio 'admin-ringtone' não encontrado!");
        return;
    }

    if (!adminAudioUnlocked) {
        console.warn("⚠️ Áudio bloqueado. Clique na tela para desbloquear.");
        unlockAdminAudio();
        return;
    }

    try {
        audio.load();
        audio.currentTime = 0;

        const playPromise = audio.play();

        if (playPromise !== undefined) {
            playPromise
                .then(() => {
                    console.log("🔔 Som tocado com sucesso! Arquivo: SOM/somchamada.mp3");
                })
                .catch(error => {
                    console.error("❌ Erro ao tocar som:", error);
                    adminAudioUnlocked = false;
                });
        }
    } catch (error) {
        console.error("❌ Erro ao tentar tocar som:", error);
    }
}

function startRingingAdmin() {
    console.log("🔔 Iniciando alerta sonoro com SOM/somchamada.mp3");
    stopRingingAdmin();
    playAdminRingSound();
    adminRingInterval = setInterval(playAdminRingSound, 5000);

    const silenceBtnContainer = document.querySelector('#admin-requests-screen .lg\\:col-span-1');
    if (silenceBtnContainer && !document.getElementById('admin-silence-btn')) {
        const silenceBtn = document.createElement('button');
        silenceBtn.id = 'admin-silence-btn';
        silenceBtn.textContent = '🔕 Silenciar Alerta';
        silenceBtn.className = 'w-full mb-4 py-2 px-4 font-semibold rounded-lg bg-yellow-500 text-gray-900 hover:bg-yellow-600';
        silenceBtn.onclick = stopRingingAdmin;
        silenceBtnContainer.prepend(silenceBtn);
    }
    const btn = document.getElementById('admin-silence-btn');
    if (btn) btn.classList.remove('hidden');
}

function stopRingingAdmin() {
    console.log("🔕 Parando alerta sonoro...");
    if (adminRingInterval) {
        clearInterval(adminRingInterval);
        adminRingInterval = null;
    }

    const audio = document.getElementById('admin-ringtone');
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
    }

    const btn = document.getElementById('admin-silence-btn');
    if (btn) btn.classList.add('hidden');
}

window.showScreen = function(screenId) {
    const body = document.body;
    document.querySelectorAll('.screen').forEach(screen => screen.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    } else {
        console.error('Tela não encontrada:', screenId);
        return;
    }
    stopRingingAdmin();

    if(clockInterval) clearInterval(clockInterval);

    const container = document.getElementById('app-container');
    const needsExtraPadding = ['admin-requests-screen', 'admin-driver-crud-screen', 'admin-user-crud-screen', 'admin-heatmap-screen', 'admin-records-screen', 'admin-screen'];
    if (needsExtraPadding.includes(screenId)) {
        container.classList.add('pt-8');
    } else {
        container.classList.remove('pt-8');
    }

    const fullHeightScreens = ['admin-requests-screen', 'admin-driver-crud-screen', 'admin-user-crud-screen', 'admin-heatmap-screen', 'admin-records-screen', 'admin-screen'];
    if (fullHeightScreens.includes(screenId)) {
        body.classList.remove('items-center');
        body.classList.add('justify-start');
    } else {
        if (!body.classList.contains('items-center')) {
            body.classList.add('items-center');
        }
        body.classList.remove('justify-start');
    }

    if (screenId === 'admin-screen') {
        const timestampEl = document.getElementById('admin-timestamp');
        if (timestampEl) {
            timestampEl.textContent = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }
    if (screenId === 'admin-requests-screen') {
        loadAdminRequests();
        renderOngoingRidesTable();
        startDigitalClock('digital-clock');
    }
    if (screenId === 'admin-driver-crud-screen') renderDriverCrudList();
    if (screenId === 'admin-user-crud-screen') renderUserCrudList();
    if (screenId === 'admin-heatmap-screen') initHeatmap();
    if (screenId === 'driver-selection-screen') populateDriverSelection();
    if (screenId === 'driver-screen') {
        loadDriverJobs();
        renderDriverRideHistory();
    }
    if (screenId === 'user-screen') {
        checkUserRideStatus();
        updateAvailableDriversCount();
        renderUserRideHistory();
    }
    if (screenId === 'admin-records-screen') {
        loadAllRecords();
        document.getElementById('records-start-date').value = '';
        document.getElementById('records-end-date').value = '';
        document.getElementById('records-company-filter').value = '';
    }
}

function renderDriverCrudList() {
    const listContainer = document.getElementById('driver-crud-list');
    listContainer.innerHTML = '';

    const countEl = document.getElementById('driver-count');
    if (countEl) {
        countEl.textContent = `${state.drivers.length} motorista(s) cadastrado(s)`;
    }

    if (state.drivers.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-400">Nenhum motorista cadastrado.</p>';
        return;
    }

    state.drivers.forEach(driver => {
        const card = document.createElement('div');
        card.className = 'card-gradient p-4 rounded-lg shadow-lg text-white';

        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-xl">${driver.name}</h3>
                <span class="text-xs font-semibold py-1 px-3 rounded-full ${driver.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}">
                    ${driver.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-300">
                <p><i class="ph ph-phone"></i> ${driver.phone}</p>
                <p><i class="ph ph-car"></i> ${driver.plate}</p>
                <p><i class="ph ph-lightning"></i> ${driver.car_model || 'N/A'}</p>
                <p><i class="ph ph-paint-brush"></i> ${driver.car_color || 'N/A'}</p>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="editDriver(${driver.id})" class="w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>
                <button onclick="promptDeleteDriver(${driver.id})" class="w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700">
                    <i class="ph ph-trash-simple"></i> Excluir
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function renderUserCrudList() {
    const listContainer = document.getElementById('user-crud-list');
    listContainer.innerHTML = '';

    const userCountEl = document.getElementById('user-count-display');
    if (userCountEl) {
        userCountEl.textContent = state.users.length;
    }

    if (state.users.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-gray-400">Nenhum usuário cadastrado.</p>';
        return;
    }

    state.users.forEach(user => {
        const card = document.createElement('div');
        card.className = 'card-gradient p-4 rounded-lg shadow-lg text-white';

        card.innerHTML = `
            <div class="flex justify-between items-center mb-3">
                <h3 class="font-bold text-xl">${user.name}</h3>
                <span class="text-xs font-semibold py-1 px-3 rounded-full bg-purple-600">
                    ${user.matricula || 'N/A'}
                </span>
            </div>
            <div class="space-y-2 text-sm text-gray-300">
                <p><i class="ph ph-building"></i> ${user.company || 'N/A'}</p>
                <p><i class="ph ph-phone"></i> ${user.phone}</p>
                <p><i class="ph ph-map-pin"></i> ${user.address || 'N/A'}</p>
            </div>
            <div class="flex gap-2 mt-4">
                <button onclick="editUser(${user.id})" class="w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-green-600 text-white hover:bg-green-700">
                    <i class="ph ph-pencil-simple"></i> Editar
                </button>
                <button onclick="deleteUser(${user.id})" class="w-full py-2 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 bg-red-600 text-white hover:bg-red-700">
                    <i class="ph ph-trash-simple"></i> Excluir
                </button>
            </div>
        `;
        listContainer.appendChild(card);
    });
}

function loadAppIcon() {
    const iconContainer = document.getElementById('app-icon-container');
    if (!iconContainer) return;
    iconContainer.innerHTML = '';
    if (state.appIcon) {
        const img = document.createElement('img');
        img.src = state.appIcon; img.className = 'h-12 w-12 object-contain';
        iconContainer.appendChild(img);
    } else {
        const defaultIconContainer = document.getElementById('app-icon-container');
        if (defaultIconContainer.innerHTML === '') {
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'h-12 w-12 text-black');
            svg.setAttribute('fill', 'currentColor');
            svg.setAttribute('viewBox', '0 0 20 20');
            svg.innerHTML = `<path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" />`;
            defaultIconContainer.appendChild(svg);
        }
    }
}

function uploadAppIcon() {
    const fileInput = document.getElementById('icon-file-input');
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(event) {
        state.appIcon = event.target.result;
        localStorage.setItem('appIcon', state.appIcon);
        loadAppIcon();
        showModal('Ícone atualizado com sucesso!');
    };
    reader.readAsDataURL(file);
}

function showModal(message, onConfirm, showCancel = false, content = {}) {
    document.getElementById('modal-message').textContent = message;
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');
    const inputContainer = document.getElementById('modal-input-container');

    Array.from(inputContainer.children).forEach(child => {
        if (child.tagName === 'INPUT' || child.tagName === 'SELECT' || child.classList.contains('autocomplete-container')) {
            child.style.display = 'none';
            if (child.tagName !== 'DIV') child.value = '';
        }
    });

    const modalAddressInput = document.getElementById('modal-input-address');
    if (modalAddressInput) modalAddressInput.value = '';

    if (content.type) {
        inputContainer.classList.remove('hidden');
        if(content.type === 'edit-driver') {
            document.getElementById('modal-input-name').style.display = 'block';
            document.getElementById('modal-input-phone').style.display = 'block';
            document.getElementById('modal-input-plate').style.display = 'block';
            document.getElementById('modal-input-model').style.display = 'block';
            document.getElementById('modal-input-color').style.display = 'block';
            document.getElementById('modal-input-password').style.display = 'block';
            document.getElementById('modal-input-status').style.display = 'block';
            document.getElementById('modal-input-name').value = content.name;
            document.getElementById('modal-input-phone').value = content.phone;
            document.getElementById('modal-input-plate').value = content.plate;
            document.getElementById('modal-input-model').value = content.car_model || '';
            document.getElementById('modal-input-color').value = content.car_color || '';
            document.getElementById('modal-input-status').value = content.status;
        } else if (content.type === 'edit-user') {
            document.getElementById('modal-input-matricula').style.display = 'block';
            document.getElementById('modal-input-name').style.display = 'block';
            document.getElementById('modal-input-password').style.display = 'block';
            document.getElementById('modal-input-company').style.display = 'block';
            document.getElementById('modal-input-address').parentElement.style.display = 'block';
            document.getElementById('modal-input-phone').style.display = 'block';

            document.getElementById('modal-input-matricula').value = content.matricula;
            document.getElementById('modal-input-name').value = content.name;
            document.getElementById('modal-input-company').value = content.company;
            const modalAddressInput = document.getElementById('modal-input-address');
            modalAddressInput.value = content.address;
            if (content.address) {
                modalAddressInput.setAttribute('data-address-valid', 'true');
            }
            document.getElementById('modal-input-phone').value = content.phone;

        } else if(content.type === 'driver-password') {
            document.getElementById('modal-input-driver-password').style.display = 'block';
        } else if(content.type === 'delete-with-password') {
            document.getElementById('modal-input-admin-password').style.display = 'block';
        }
    } else {
         inputContainer.classList.add('hidden');
    }

    confirmBtn.onclick = onConfirm;
    cancelBtn.style.display = showCancel ? 'inline-block' : 'none';
    confirmBtn.textContent = showCancel ? 'Confirmar' : 'OK';
    if (!showCancel) {
        confirmBtn.onclick = closeModal;
    }

    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    Array.from(document.getElementById('modal-input-container').children).forEach(child => {
        if (child.tagName === 'INPUT' || child.tagName === 'SELECT') {
            child.value = '';
            child.style.display = 'none';
        }
        if (child.classList.contains('autocomplete-container')) {
            child.style.display = 'none';
        }
    });
}

function logout() {
    state.currentUserId = null;
    state.currentDriverId = null;
    localStorage.removeItem('sessionType');
    localStorage.removeItem('loggedInUserId');
    localStorage.removeItem('loggedInDriverId');
    showScreen('initial-screen');
}

async function loginAdmin() {
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');
    if (password === '789512') {
        errorEl.classList.add('hidden');
        document.getElementById('admin-password').value = '';
        localStorage.setItem('sessionType', 'admin');
        showScreen('admin-screen');
    } else {
        errorEl.classList.remove('hidden');
    }
}

async function loginUser() {
    const matricula = document.getElementById('user-id').value;
    const password = document.getElementById('user-password').value;
    const errorEl = document.getElementById('user-login-error');

    const { data: user, error } = await supabaseClient
        .from('users')
        .select('*')
        .eq('matricula', matricula)
        .eq('password', password)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Erro no Supabase ao tentar login:', error);
        errorEl.textContent = 'Erro de comunicação com o servidor. Por favor, tente novamente.';
        errorEl.classList.remove('hidden');
        return;
    }

    if (user) {
        state.currentUserId = user.id;
        localStorage.setItem('sessionType', 'user');
        localStorage.setItem('loggedInUserId', user.id);
        errorEl.classList.add('hidden');
        document.getElementById('user-id').value = '';
        document.getElementById('user-password').value = '';
        showScreen('user-screen');
    } else {
        errorEl.textContent = 'Matrícula ou senha incorreta!';
        errorEl.classList.remove('hidden');
    }
}

function startDigitalClock(elementId) {
    const clockElement = document.getElementById(elementId);
    if (!clockElement) return;

    if (clockInterval) clearInterval(clockInterval);

    clockInterval = setInterval(() => {
        const now = new Date();
        clockElement.textContent = now.toLocaleTimeString('pt-BR');
    }, 1000);
}

function promptToGoBack() {
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    cancelBtn.textContent = 'Apenas Voltar';
    cancelBtn.onclick = () => {
        closeModal();
        showScreen('admin-screen');
    };

    confirmBtn.textContent = 'Exportar e Voltar';
    confirmBtn.onclick = () => {
        if (state.rides.length === 0) {
            showModal("Nenhuma corrida para exportar. Voltando ao painel...");
            setTimeout(() => {
                closeModal();
                showScreen('admin-screen');
            }, 2000);
        } else {
            exportDailyReportNow();
            closeModal();
            showScreen('admin-screen');
        }
    };

    showModal('Deseja exportar o relatório diário antes de sair?', null, true);
}

function cleanAddressString(address) {
    if (typeof address !== 'string') return '';
    return address.replace(/^\["|"\]$/g, '').trim();
}

async function requestRide() {
    const originAddress = document.getElementById('origin').value;
    const destinationAddress = document.getElementById('destination').value;

    if (!state.currentUserOrigin || state.currentUserOrigin.properties.formatted !== originAddress) {
        showModal('Por favor, selecione um endereço de ORIGEM válido da lista de sugestões.');
        return;
    }
    if (!state.currentUserDestination || state.currentUserDestination.properties.formatted !== destinationAddress) {
        showModal('Por favor, selecione um endereço de DESTINO válido da lista de sugestões.');
        return;
    }

    const isScheduled = document.getElementById('schedule-toggle').checked;
    const scheduledTimeValue = document.getElementById('schedule-datetime').value;
    let scheduledTime = null;

    if (isScheduled) {
        if (!scheduledTimeValue) {
            showModal('Por favor, selecione a data e hora para o agendamento.');
            return;
        }
        scheduledTime = new Date(scheduledTimeValue).toISOString();
        if (new Date(scheduledTime) < new Date()) {
            showModal('A data de agendamento não pode ser no passado.');
            return;
        }
    }

    document.getElementById('user-request-form').classList.add('hidden');
    document.getElementById('user-status').classList.remove('hidden');
    document.getElementById('user-status-message').textContent = 'Solicitando corrida...';

    try {
        const originCoords = state.currentUserOrigin.properties;
        const userLocation = { lat: originCoords.lat, lon: originCoords.lon };
        const currentUser = state.users.find(u => u.id === state.currentUserId);

        const newRide = {
            destination: destinationAddress,
            origin_address: originAddress,
            status: 'requested',
            userId: currentUser.id,
            userName: currentUser.name,
            userCompany: currentUser.company,
            requestTime: new Date().toISOString(),
            userLocation: userLocation,
            request_type: isScheduled ? 'scheduled' : 'immediate',
            scheduled_datetime: scheduledTime
        };

        const { data, error } = await supabaseClient.from('rides').insert([newRide]).select().single();

        if (error) {
            console.error("Erro ao solicitar corrida:", error);
            showModal("Não foi possível solicitar a corrida. Verifique os endereços.");
            document.getElementById('user-request-form').classList.remove('hidden');
            document.getElementById('user-status').classList.add('hidden');
            return;
        }

        state.currentUserRideId = data.id;
        document.getElementById('user-status-message').textContent = 'Aguardando um motorista aceitar...';
        startUserStatusCheck();

        state.currentUserOrigin = null;
        state.currentUserDestination = null;

    } catch (error) {
        console.error("Erro ao processar solicitação de corrida:", error);
        showModal('Não foi possível processar sua solicitação.');
        document.getElementById('user-request-form').classList.remove('hidden');
        document.getElementById('user-status').classList.add('hidden');
    }
}

function checkUserRideStatus() {
    if (state.currentUserRideId) {
        const myRide = state.rides.find(r => r.id === state.currentUserRideId);
        if (myRide) {
            document.getElementById('user-request-form').classList.add('hidden');
            document.getElementById('user-status').classList.remove('hidden');
            updateUserStatusMessage(myRide);
            startUserStatusCheck();
        } else {
            state.currentUserRideId = null;
            document.getElementById('user-request-form').classList.remove('hidden');
            document.getElementById('user-status').classList.add('hidden');
            document.getElementById('user-status-message').textContent = 'Sua viagem foi finalizada ou cancelada.';
        }
    }
}

function startUserStatusCheck() {
    if (state.userStatusInterval) clearInterval(state.userStatusInterval);
    state.userStatusInterval = setInterval(async () => {
        if (!state.currentUserRideId) {
            clearInterval(state.userStatusInterval);
            return;
        }
        const { data: myRide, error } = await supabaseClient.from('rides').select('*').eq('id', state.currentUserRideId).single();
        if (myRide) {
            updateUserStatusMessage(myRide);
        } else {
            clearInterval(state.userStatusInterval);
            state.currentUserRideId = null;
            document.getElementById('user-request-form').classList.remove('hidden');
            document.getElementById('user-status').classList.add('hidden');
            document.getElementById('user-status-message').textContent = 'Sua viagem foi finalizada ou cancelada (pelo sistema).';
        }
    }, 5000);
}

async function updateUserStatusMessage(ride) {
    const searchingIconContainer = document.getElementById('status-icon-searching');
    const enRouteIconContainer = document.getElementById('status-icon-en-route');
    const arrivedPickupIconContainer = document.getElementById('status-icon-arrived-pickup');
    const inProgressIconContainer = document.getElementById('status-icon-in-progress');

    const cancelRideBtn = document.getElementById('cancel-ride-btn');
    let message = 'Aguardando um motorista...';

    searchingIconContainer.classList.add('hidden');
    enRouteIconContainer.classList.add('hidden');
    arrivedPickupIconContainer.classList.add('hidden');
    inProgressIconContainer.classList.add('hidden');
    enRouteIconContainer.innerHTML = '';
    arrivedPickupIconContainer.innerHTML = '';
    inProgressIconContainer.innerHTML = '';

    if (ride.status === 'requested' || ride.status === 'assigned' || ride.status === 'accepted' || ride.status === 'arrived_pickup') {
        cancelRideBtn.classList.remove('hidden');
    } else {
        cancelRideBtn.classList.add('hidden');
    }

    switch(ride.status) {
        case 'assigned':
            message = `Motorista ${ride.driverName} foi designado. Aguardando aceite...`;
            searchingIconContainer.classList.remove('hidden');
            break;
        case 'accepted':
            message = `Motorista ${ride.driverName} está a caminho!`;

            if (ride.driverCurrentLocation && ride.userLocation) {
                const distance = await getDrivingDistanceByCoords(
                    ride.userLocation,
                    ride.driverCurrentLocation
                );

                if (distance !== null) {
                    message += ` Distância: ${distance.toFixed(2)} km`;
                } else {
                    message += ` (Calculando distância...)`;
                }
            }

            const acceptedImg = document.createElement('img');
            acceptedImg.src = 'images/aceitou.png';
            acceptedImg.alt = 'Motorista Aceitou';
            acceptedImg.className = 'h-20 w-20 mx-auto';
            enRouteIconContainer.appendChild(acceptedImg);
            enRouteIconContainer.classList.remove('hidden');
            break;
        case 'arrived_pickup':
            message = `Seu motorista, ${ride.driverName}, chegou no local de embarque.`;
            const arrivedImg = document.createElement('img');
            arrivedImg.src = 'images/final.png';
            arrivedImg.alt = 'Motorista Chegou';
            arrivedImg.className = 'h-20 w-20 mx-auto';
            arrivedPickupIconContainer.appendChild(arrivedImg);
            arrivedPickupIconContainer.classList.remove('hidden');
            break;
        case 'in_progress':
            message = `Viagem para ${formatDestination(ride.destination)} em andamento.`;
            const inProgressImg = document.createElement('img');
            inProgressImg.src = 'images/destino.png';
            inProgressImg.alt = 'Viagem Iniciada';
            inProgressImg.className = 'h-20 w-20 mx-auto animate-bounce';
            inProgressIconContainer.appendChild(inProgressImg);
            inProgressIconContainer.classList.remove('hidden');
            cancelRideBtn.classList.add('hidden');
            break;
        case 'completed':
            message = `Viagem finalizada! Obrigado por escolher a GARCIA TAXI.`;
            clearInterval(state.userStatusInterval);
            state.currentUserRideId = null;
            setTimeout(() => {
                document.getElementById('user-request-form').classList.remove('hidden');
                document.getElementById('user-status').classList.add('hidden');
                document.getElementById('destination').value = '';
                renderUserRideHistory();
            }, 5000);
            break;
        case 'canceled':
            message = `Sua viagem foi cancelada.`;
            clearInterval(state.userStatusInterval);
            state.currentUserRideId = null;
            setTimeout(() => {
                document.getElementById('user-request-form').classList.remove('hidden');
                document.getElementById('user-status').classList.add('hidden');
                document.getElementById('destination').value = '';
                renderUserRideHistory();
            }, 3000);
            break;
    }
    document.getElementById('user-status-message').textContent = message;
}

async function cancelRide() {
    if (state.currentUserRideId) {
        if (driverWatchId) {
            navigator.geolocation.clearWatch(driverWatchId);
            driverWatchId = null;
        }
        const { error } = await supabaseClient.from('rides').update({ status: 'canceled' }).eq('id', state.currentUserRideId);
        if (error) {
            showModal('Não foi possível cancelar a corrida.');
        }
    }
}

async function loadAdminRequests() {
    const list = document.getElementById('admin-requests-list');
    list.innerHTML = '';

    const requestedRides = state.rides.filter(r => r.status === 'requested' || r.status === 'approved' || r.status === 'pending_approval' || r.status === 'scheduled');

    requestedRides.sort((a, b) => new Date((a.request_type === 'scheduled' && a.scheduled_datetime) || a.requestTime) - new Date((b.request_type === 'scheduled' && b.scheduled_datetime) || b.requestTime));

    const solicitadoCount = state.rides.filter(r => ['requested', 'approved', 'pending_approval'].includes(r.status)).length;
    const agendadaCount = state.rides.filter(r => r.status === 'scheduled').length;
    const designadoCount = state.rides.filter(r => r.status === 'assigned').length;
    const emAndamentoCount = state.rides.filter(r => ['accepted', 'arrived_pickup', 'in_progress'].includes(r.status)).length;
    const concluidasCount = state.rides.filter(r => r.status === 'completed').length;

    document.getElementById('status-agendada-count').textContent = agendadaCount;
    document.getElementById('status-solicitado-count').textContent = solicitadoCount;
    document.getElementById('status-designado-count').textContent = designadoCount;
    document.getElementById('status-em-andamento-count').textContent = emAndamentoCount;
    document.getElementById('status-concluidas-count').textContent = concluidasCount;

    const activeDriversCount = state.drivers.filter(d => d.status === 'active').length;
    const totalDriversCount = state.drivers.length;

    document.getElementById('total-drivers-count').textContent = totalDriversCount;
    document.getElementById('active-drivers-count').textContent = activeDriversCount;
    document.getElementById('inactive-drivers-count').textContent = totalDriversCount - activeDriversCount;

    renderDriverStatusChart(activeDriversCount, totalDriversCount - activeDriversCount);

    if (requestedRides.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400">Nenhuma nova solicitação.</p>';
    } else {
        for (const ride of requestedRides) {
            const card = document.createElement('div');
            card.className = 'card-gradient p-4 rounded-lg shadow-md';

            const originAddress = cleanAddressString(ride.origin_address);

            let destinationsHTML = '';
            const destinationString = ride.destination;

            if (typeof destinationString === 'string' && destinationString.startsWith('[{') && destinationString.endsWith('}]')) {
                try {
                    const destinationsArray = JSON.parse(destinationString);
                    if (Array.isArray(destinationsArray) && destinationsArray.length > 0) {
                        const addresses = destinationsArray
                            .map(dest => dest.address || null)
                            .filter(Boolean);

                            destinationsHTML = `
                                <p class="font-semibold">Destinos:</p>
                                <ul class="list-disc list-inside pl-2 text-sm">
                                    ${addresses.map(addr => `<li><span class="font-normal">${addr}</span></li>`).join('')}
                                </ul>
                            `;
                    } else {
                        destinationsHTML = `<p class="font-semibold">Destino: <span class="font-normal">-</span></p>`;
                    }
                } catch (e) {
                    destinationsHTML = `<p class="font-semibold">Destino: <span class="font-normal">${formatDestination(destinationString)}</span></p>`;
                }
            } else {
                destinationsHTML = `<p class="font-semibold">Destino: <span class="font-normal">${formatDestination(destinationString)}</span></p>`;
            }

            const distanceInfo = ride.km ? `<p class="text-sm text-gray-400">Distância: ${ride.km} km</p>` : `<p class="text-sm text-gray-500">Distância será calculada ao finalizar</p>`;

            let rideTypeInfo = '';
            if (ride.request_type === 'scheduled' && ride.scheduled_datetime) {
                const scheduledDate = new Date(ride.scheduled_datetime);
                const formattedTime = scheduledDate.toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                rideTypeInfo = `<span class="text-xs font-bold py-1 px-2 rounded-full bg-orange-500 text-white">AGENDADA ${formattedTime}</span>`;
            } else {
                rideTypeInfo = '<span class="text-xs font-bold py-1 px-2 rounded-full bg-blue-500 text-white">IMEDIATA</span>';
            }

            let actionContent = '';
            if (ride.status === 'pending_approval') {
                actionContent = `
                    <div class="mt-4 text-center p-2 rounded-lg bg-yellow-700 text-white font-semibold">
                        Aguardando Aprovação
                    </div>
                `;
            } else {
                const activeDrivers = state.drivers.filter(d => d.status === 'active');
                let driverOptions = activeDrivers.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
                if (activeDrivers.length === 0) {
                    driverOptions = `<option value="" disabled>Nenhum motorista ativo</option>`;
                }
                actionContent = `
                    <div class="mt-4 flex gap-2">
                        <select id="driver-select-${ride.id}" class="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none text-white">
                            <option value="" class="text-gray-400">Selecione um motorista</option>
                            ${driverOptions}
                        </select>
                        <button onclick="assignDriver(${ride.id})" class="py-2 px-4 font-semibold rounded-lg button-gradient whitespace-nowrap text-white">Marcar</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <h4 class="font-semibold text-lg">Nova Solicitação</h4>
                        ${rideTypeInfo}
                    </div>
                    <p class="font-semibold">Origem: <span class="font-normal">${originAddress || 'Não informado'}</span></p>
                    ${destinationsHTML}
                    <p class="font-semibold">Observação: <span class="font-normal text-yellow-300">${ride.observation || 'Nenhuma'}</span></p>
                ${distanceInfo}
                <p class="text-sm text-gray-400">De: ${ride.userName} ${ride.userCompany ? `(${ride.userCompany})` : ''}</p>
                <p class="text-sm text-gray-300">Solicitado em: ${new Date(ride.requestTime).toLocaleTimeString()}</p>
                ${actionContent}
            `;

            list.appendChild(card);
        };
    }
}

async function renderOngoingRidesTable() {
    const tableContainer = document.getElementById('admin-ongoing-rides-table');
    tableContainer.innerHTML = '<div class="loader mx-auto"></div>';

    const ongoingRides = state.rides.filter(r => !['requested', 'approved', 'pending_approval', 'rejected', 'completed', 'canceled'].includes(r.status));

    if (ongoingRides.length === 0) {
        tableContainer.innerHTML = '<p class="text-center text-gray-400">Nenhuma corrida em andamento no momento.</p>';
        return;
    }

    const ridesWithDistance = ongoingRides.map((ride) => {
        const originAddress = cleanAddressString(ride.origin_address);
        const formattedDestination = formatDestination(ride.destination);
        const distanceKm = ride.km || 'Ao finalizar';
        return { ...ride, distanceKm: distanceKm, cleanedOrigin: originAddress, formattedDestination: formattedDestination };
    });

    let tableHTML = `
        <table class="w-full text-sm text-left">
            <thead class="text-xs text-gray-300 uppercase bg-gray-900/30">
                <tr>
                    <th scope="col" class="px-4 py-3">Usuário</th>
                    <th scope="col" class="px-4 py-3">Origem</th>
                    <th scope="col" class="px-4 py-3">Destino</th>
                    <th scope="col" class="px-4 py-3">Observação</th>
                    <th scope="col" class="px-4 py-3">Distância (km)</th>
                    <th scope="col" class="px-4 py-3">Motorista</th>
                    <th scope="col" class="px-4 py-3">Status</th>
                    <th scope="col" class="px-4 py-3">Tipo</th>
                    <th scope="col" class="px-4 py-3">Data/Hora</th>
                    <th scope="col" class="px-4 py-3">Ações</th>
                </tr>
            </thead>
            <tbody>
    `;

    ridesWithDistance.sort((a, b) => {
        const dateA = (a.request_type === 'scheduled' && a.scheduled_datetime) ? new Date(a.scheduled_datetime) : new Date(a.requestTime);
        const dateB = (b.request_type === 'scheduled' && b.scheduled_datetime) ? new Date(b.scheduled_datetime) : new Date(b.requestTime);
        return dateA - dateB;
    });

    ridesWithDistance.forEach(ride => {
        const statusInfo = translateStatus(ride.status);

        let rideTypeInfo = '';
        if (ride.request_type === 'scheduled') {
            rideTypeInfo = `<span class="text-xs font-bold py-1 px-2 rounded-full bg-orange-500 text-white">AGENDADA</span>`;
        } else {
            rideTypeInfo = '<span class="text-xs font-bold py-1 px-2 rounded-full bg-blue-500 text-white">IMEDIATA</span>';
        }

        let dateTimeString = '';
        const options = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        if (ride.request_type === 'scheduled' && ride.scheduled_datetime) {
            dateTimeString = new Date(ride.scheduled_datetime).toLocaleString('pt-BR', options);
        } else {
            dateTimeString = new Date(ride.requestTime).toLocaleString('pt-BR', options);
        }

        let driverCellHTML = ride.driverName || 'N/A';
        let actionsCellHTML = `<div class="flex items-center gap-2">`;

        if (ride.status !== 'in_progress' && ride.status !== 'arrived_pickup') {
            const activeDrivers = state.drivers.filter(d => d.status === 'active');
            let driverOptions = activeDrivers.map(d => `<option value="${d.id}" ${ride.driverId == d.id ? 'selected' : ''}>${d.name}</option>`).join('');

            driverCellHTML = `
                <select id="ongoing-driver-select-${ride.id}" class="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none text-xs text-white">
                    <option value="" class="text-gray-400">Selecione...</option>
                    ${driverOptions}
                </select>
            `;

            actionsCellHTML += `<button onclick="updateRideDriver(${ride.id})" class="py-1 px-2 text-xs font-semibold rounded-lg button-gradient whitespace-nowrap text-white">Salvar</button>`;
        }

        actionsCellHTML += `
            <button onclick="adminCompleteRide(${ride.id})" title="Marcar como Finalizada" class="p-1 rounded-lg bg-green-600 hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            </button>
            <button onclick="adminDeleteRide(${ride.id})" title="Excluir Corrida" class="p-1 rounded-lg bg-red-600 hover:bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        </div>`;

        tableHTML += `
            <tr class="border-b border-gray-700 hover:bg-gray-800/20">
                <td class="px-4 py-3 font-medium">${ride.userName}</td>
                <td class="px-4 py-3">${ride.cleanedOrigin || '-'}</td>
                <td class="px-4 py-3">${ride.formattedDestination}</td>
                <td class="px-4 py-3 text-yellow-300">${ride.observation || '-'}</td>
                <td class="px-4 py-3 font-semibold">${ride.distanceKm}</td>
                <td class="px-4 py-3">${driverCellHTML}</td>
                <td class="px-4 py-3">
                    <span class="status-badge ${statusInfo.colorClass}">${statusInfo.text}</span>
                </td>
                <td class="px-4 py-3">${rideTypeInfo}</td>
                <td class="px-4 py-3">${dateTimeString}</td>
                <td class="px-4 py-3">${actionsCellHTML}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    tableContainer.innerHTML = tableHTML;
}

async function updateRideDriver(rideId) {
    const selectElement = document.getElementById(`ongoing-driver-select-${rideId}`);
    if (!selectElement) return;

    const selectedDriverId = selectElement.value;

    if (!selectedDriverId) {
        showModal("Por favor, selecione um motorista para salvar.");
        return;
    }

    const driver = state.drivers.find(d => d.id == selectedDriverId);
    if (!driver) {
        showModal("Motorista selecionado não encontrado.");
        return;
    }

    const { error } = await supabaseClient
        .from('rides')
        .update({
            status: 'assigned',
            driverId: parseInt(driver.id),
            driverName: driver.name
        })
        .eq('id', rideId);

    if (error) {
        console.error("Erro ao atualizar motorista da corrida:", error);
        showModal("Não foi possível atualizar o motorista.");
    } else {
        showModal("Motorista atribuído com sucesso!");
    }
}

async function assignDriver(rideId) {
    const selectedDriverId = document.getElementById(`driver-select-${rideId}`).value;
    if (!selectedDriverId) {
        showModal('Por favor, selecione um motorista.');
        return;
    }
    const driver = state.drivers.find(d => d.id == selectedDriverId);
    const { error } = await supabaseClient.from('rides').update({ status: 'assigned', driverId: parseInt(driver.id), driverName: driver.name }).eq('id', rideId);
    if (error) {
        console.error("Erro ao designar motorista:", error);
        showModal("Não foi possível designar o motorista.");
    }
}

async function addDriver() {
    const nameInput = document.getElementById('new-driver-name');
    const phoneInput = document.getElementById('new-driver-phone');
    const plateInput = document.getElementById('new-driver-plate');
    const modelInput = document.getElementById('new-driver-model');
    const colorInput = document.getElementById('new-driver-color');
    const passwordInput = document.getElementById('new-driver-password');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const plate = plateInput.value.trim();
    const model = modelInput.value.trim();
    const color = colorInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !phone || !plate || !password || !model || !color) {
        showModal('Todos os campos são obrigatórios.');
        return;
    }
    const { error } = await supabaseClient.from('drivers').insert([{
        name, phone, plate, password, status: 'inactive', car_model: model, car_color: color
    }]);

    if (error) {
        console.error('Error adding driver:', error);
        showModal('Erro ao adicionar motorista.');
    } else {
        nameInput.value = phoneInput.value = plateInput.value = passwordInput.value = modelInput.value = colorInput.value = '';
        showModal('Motorista adicionado com sucesso!');
    }
}

function editDriver(driverId) {
    const driver = state.drivers.find(d => d.id === driverId);
    if (!driver) return;
    const onConfirm = async () => {
        const newName = document.getElementById('modal-input-name').value.trim();
        const newPhone = document.getElementById('modal-input-phone').value.trim();
        const newPlate = document.getElementById('modal-input-plate').value.trim();
        const newModel = document.getElementById('modal-input-model').value.trim();
        const newColor = document.getElementById('modal-input-color').value.trim();
        const newPassword = document.getElementById('modal-input-password').value.trim();
        const newStatus = document.getElementById('modal-input-status').value;

        if (newName && newPhone && newPlate && newModel && newColor) {
            const updateData = {
                name: newName,
                phone: newPhone,
                plate: newPlate,
                status: newStatus,
                car_model: newModel,
                car_color: newColor
            };
            if (newPassword) updateData.password = newPassword;
            const { error } = await supabaseClient.from('drivers').update(updateData).eq('id', driverId);
            if (error) {
                console.error('Error updating driver:', error);
                showModal('Erro ao atualizar motorista.');
            } else {
                closeModal();
            }
        } else {
            showModal('Nome, Telefone, Placa, Modelo e Cor são obrigatórios.');
        }
    };
    showModal('Editar dados do motorista:', onConfirm, true, {
        type: 'edit-driver',
        name: driver.name,
        phone: driver.phone,
        plate: driver.plate,
        car_model: driver.car_model,
        car_color: driver.car_color,
        status: driver.status
    });
}

function promptDeleteDriver(driverId) {
    const onConfirm = async () => {
        const password = document.getElementById('modal-input-admin-password').value;
        if (password === '789512') { deleteDriver(driverId); }
        else { showModal('Senha incorreta!'); }
    };
    showModal('Digite a senha do admin para excluir:', onConfirm, true, { type: 'delete-with-password' });
}

async function deleteDriver(driverId) {
    const { error } = await supabaseClient.from('drivers').delete().eq('id', driverId);
    if (error) { console.error('Error deleting driver:', error); showModal('Erro ao excluir motorista.'); }
    else { closeModal(); }
}

async function addUser() {
    const idInput = document.getElementById('new-user-id');
    const nameInput = document.getElementById('new-user-name');
    const passwordInput = document.getElementById('new-user-password');
    const companyInput = document.getElementById('new-user-company');
    const addressInput = document.getElementById('new-user-address');
    const phoneInput = document.getElementById('new-user-phone');

    const matricula = idInput.value.trim();
    const name = nameInput.value.trim();
    const password = passwordInput.value.trim();
    const company = companyInput.value.trim();
    const address = addressInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!matricula || !name || !password || !phone) {
        showModal('Matrícula, Nome, Senha e Telefone são obrigatórios.');
        return;
    }

    if (address && !addressInput.getAttribute('data-address-valid')) {
        showModal('Por favor, selecione um endereço válido da lista de sugestões.');
        return;
    }

    const { error } = await supabaseClient.from('users').insert([{ matricula, name, password, company, address, phone }]);

    if (error) {
        console.error('Error adding user:', error);
        showModal('Erro ao adicionar usuário.');
    } else {
        idInput.value = nameInput.value = passwordInput.value = companyInput.value = addressInput.value = phoneInput.value = '';
        addressInput.removeAttribute('data-address-valid');
        showModal('Usuário adicionado com sucesso!');
    }
}

function editUser(userId) {
    const user = state.users.find(u => u.id === userId);
    if (!user) return;
    const onConfirm = async () => {
        const newMatricula = document.getElementById('modal-input-matricula').value.trim();
        const newName = document.getElementById('modal-input-name').value.trim();
        const newPassword = document.getElementById('modal-input-password').value.trim();
        const newCompany = document.getElementById('modal-input-company').value.trim();
        const addressInput = document.getElementById('modal-input-address');
        const newAddress = addressInput.value.trim();
        const newPhone = document.getElementById('modal-input-phone').value.trim();

        if (newName && newPhone) {
            if (newAddress && !addressInput.getAttribute('data-address-valid')) {
                showModal('Por favor, selecione um endereço válido da lista de sugestões.');
                return;
            }

            const updateData = { matricula: newMatricula, name: newName, company: newCompany, address: newAddress, phone: newPhone };
            if (newPassword) updateData.password = newPassword;
            const { error } = await supabaseClient.from('users').update(updateData).eq('id', userId);
            if (error) { console.error('Error updating user:', error); showModal('Erro ao atualizar usuário.'); }
            else { closeModal(); }
        } else { showModal('Nome completo e telefone são obrigatórios.'); }
    };
    showModal('Editar dados do usuário:', onConfirm, true, { type: 'edit-user', matricula: user.matricula, name: user.name, company: user.company, address: user.address, phone: user.phone });
}

async function deleteUser(userId) {
    const onConfirm = async () => {
        const { error } = await supabaseClient.from('users').delete().eq('id', userId);
        if (error) { console.error('Error deleting user:', error); showModal('Erro ao excluir usuário.'); }
        else { closeModal(); }
    };
    showModal('Tem certeza que deseja excluir este usuário?', onConfirm, true);
}

function exportUsersToExcel() {
    if (state.users.length === 0) {
        showModal("Nenhum usuário cadastrado para exportar.");
        return;
    }

    const dataToExport = state.users.map(user => ({
        'Matrícula': user.matricula,
        'Nome Completo': user.name,
        'Empresa': user.company || 'N/A',
        'Endereço': user.address || 'N/A',
        'Telefone': user.phone
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Lista de Usuários");

    worksheet['!cols'] = [
        { wch: 15 },
        { wch: 35 },
        { wch: 20 },
        { wch: 40 },
        { wch: 20 }
    ];

    XLSX.writeFile(workbook, "relatorio_usuarios.xlsx");
}

function populateDriverSelection() {
    const list = document.getElementById('driver-list-selection');
    const timestampEl = document.getElementById('driver-selection-timestamp');
    list.innerHTML = '';
    const timestamp = new Date().toLocaleString('pt-BR');
    timestampEl.textContent = `Status atualizado em ${timestamp}`;

    state.drivers.forEach(driver => {
        const isDriverBusy = state.rides.some(ride =>
            ride.driverId === driver.id &&
            ride.status !== 'completed' &&
            ride.status !== 'canceled'
        );
        const button = document.createElement('button');
        button.className = 'w-full py-3 px-6 text-lg font-semibold rounded-lg card-gradient shadow-lg transform hover:scale-105 transition-transform flex justify-between items-center';
        button.onclick = () => selectDriver(driver.id);
        button.innerHTML = `
            <span class="text-white">${driver.name}</span>
            <span class="text-sm font-bold py-1 px-3 rounded-full ${driver.status === 'active' && !isDriverBusy ? 'bg-green-500 text-white' : 'bg-red-600 text-white'}">
                ${driver.status === 'active' && !isDriverBusy ? 'Livre' : 'Ocupado'}
            </span>
        `;
        list.appendChild(button);
    });
}

function selectDriver(driverId) {
    tempDriverId = driverId;
    const driver = state.drivers.find(d => d.id === driverId);
    if (!driver) return;
    const onConfirm = () => {
        const passwordInput = document.getElementById('modal-input-driver-password');
        if (passwordInput.value === driver.password) {
            state.currentDriverId = driverId;
            localStorage.setItem('sessionType', 'driver');
            localStorage.setItem('loggedInDriverId', driverId);
            document.getElementById('driver-name-display').textContent = `Bem-vindo, ${driver.name}`;
            updateDriverStatusButton();
            showScreen('driver-screen');
            closeModal();
        } else {
            document.getElementById('modal-message').textContent = "Senha Incorreta!";
        }
    };
    showModal(`Login para ${driver.name}`, onConfirm, true, { type: 'driver-password' });
}

function loadDriverJobs() {
    if (!state.currentDriverId) return;
    const list = document.getElementById('driver-jobs-list');
    list.innerHTML = '';
    const myJobs = state.rides.filter(r => r.driverId === state.currentDriverId && r.status !== 'completed' && r.status !== 'canceled');
    const statsDisplay = document.getElementById('driver-stats-display');
    const jobCount = myJobs.length;
    const timestamp = new Date().toLocaleString('pt-BR');
    statsDisplay.textContent = `${jobCount} solicitações carregadas em ${timestamp}`;

    if (myJobs.length === 0) {
        list.innerHTML = '<p class="text-center text-gray-400">Nenhuma corrida para você no momento.</p>';
        stopRingingAdmin();
        if (driverWatchId) {
            navigator.geolocation.clearWatch(driverWatchId);
            driverWatchId = null;
        }
        return;
    }

    let hasAssignedJob = false;
    myJobs.forEach(ride => {
        const card = document.createElement('div');
        card.className = 'card-gradient p-4 rounded-lg shadow-md';
        const requestDateTime = new Date(ride.requestTime).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        let content = `
            <div class="flex justify-between items-start mb-1">
                <p class="font-semibold pr-2">Destino Final: <span class="font-normal">${formatDestination(ride.destination)}</span></p>
                <p class="text-sm text-gray-300">Solicitado por: ${ride.userName} ${ride.userCompany ? `(${ride.userCompany})` : ''}</p>
                <p class="text-xs text-gray-400 whitespace-nowrap">${requestDateTime}</p>
            </div>
            <p class="text-sm text-gray-300 mb-4">Status: <span class="font-semibold text-yellow-300">${translateStatus(ride.status).text}</span></p>
        `;
        if (ride.status === 'assigned') {
            hasAssignedJob = true;
            content += `<button onclick="acceptRide(${ride.id})" class="mt-4 w-full py-2 px-4 font-semibold rounded-lg button-gradient text-white">ACEITAR CORRIDA</button>`;
        } else if (ride.status === 'accepted') {
            content += `<button onclick="arriveAtPickup(${ride.id})" class="mt-4 w-full py-2 px-4 font-semibold rounded-lg button-gradient text-white">CHEGUEI NO LOCAL DE EMBARQUE</button>`;
        } else if (ride.status === 'arrived_pickup') {
            content += `<button onclick="startTrip(${ride.id})" class="mt-4 w-full py-2 px-4 font-semibold rounded-lg button-gradient text-white">INICIAR VIAGEM PARA O DESTINO</button>`;
        } else if (ride.status === 'in_progress') {
            content += `<button onclick="completeRide(${ride.id})" class="mt-4 w-full py-2 px-4 font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white">FINALIZAR CORRIDA</button>`;
        }
        card.innerHTML = content;
        list.appendChild(card);
    });
    if (hasAssignedJob) startRingingAdmin(); else stopRingingAdmin();
}

async function acceptRide(rideId) {
    stopRingingAdmin();
    startDriverTracking(rideId);

    const { error } = await supabaseClient.from('rides').update({ status: 'accepted', acceptTime: new Date().toISOString() }).eq('id', rideId);
    if (error) {
        console.error("Erro ao aceitar corrida:", error);
        showModal("Não foi possível aceitar a corrida.");
    } else {
        const ride = state.rides.find(r => r.id === rideId);

        if (ride && ride.userLocation && ride.userLocation.lat && ride.userLocation.lon) {
            const { lat, lon } = ride.userLocation;
            window.open(`waze://?ll=${lat},${lon}&navigate=yes`, '_blank');
        } else if (ride && ride.origin_address) {
            window.open(`waze://?q=${encodeURIComponent(ride.origin_address)}&navigate=yes`, '_blank');
        } else {
            showModal("Não foi possível obter a localização do usuário ou endereço de origem para navegação.");
        }
    }
}

async function arriveAtPickup(rideId) {
    const { error } = await supabaseClient.from('rides').update({ status: 'arrived_pickup' }).eq('id', rideId);
    if (error) {
        console.error("Erro ao atualizar status para 'chegou no local':", error);
        showModal("Não foi possível marcar como 'chegou no local'.");
    }
}

async function startTrip(rideId) {
    const ride = state.rides.find(r => r.id === rideId);
    if (ride) {
        const { error } = await supabaseClient.from('rides').update({ status: 'in_progress' }).eq('id', rideId);
        if (error) {
            console.error("Erro ao iniciar viagem:", error);
            showModal("Não foi possível iniciar a viagem.");
        } else {
            const destinationAddress = formatDestination(ride.destination);
            window.open(`waze://?q=${encodeURIComponent(destinationAddress)}&navigate=yes`, '_blank');
        }
    }
}

async function completeRide(rideId) {
    const ride = state.rides.find(r => r.id === rideId);
    let finalDistance = null;

    if (ride && ride.origin_address && ride.destination) {
        try {
            const distance = await getDrivingDistance(ride.origin_address, formatDestination(ride.destination));
            if (distance !== null) {
                finalDistance = distance.toFixed(2);
            }
        } catch (e) {
            console.error("Erro ao calcular distância final:", e);
        }
    }

    const { error } = await supabaseClient
        .from('rides')
        .update({
            status: 'completed',
            km: finalDistance
        })
        .eq('id', rideId);

    if (error) {
        console.error("Erro ao completar corrida:", error);
        showModal("Não foi possível finalizar a corrida.");
    } else {
        if (driverWatchId) {
            navigator.geolocation.clearWatch(driverWatchId);
            driverWatchId = null;
        }
    }
}

function startDriverTracking(rideId) {
    if (driverWatchId) {
        navigator.geolocation.clearWatch(driverWatchId);
    }

    driverWatchId = navigator.geolocation.watchPosition(async (position) => {
        const driverLocation = { lat: position.coords.latitude, lon: position.coords.longitude };
        const currentRide = state.rides.find(r => r.id === rideId && r.status !== 'completed' && r.status !== 'canceled');
        if (currentRide) {
            await supabaseClient.from('rides').update({ driverCurrentLocation: driverLocation }).eq('id', rideId);
        } else {
            navigator.geolocation.clearWatch(driverWatchId);
            driverWatchId = null;
        }
    }, (error) => {
        console.error("Erro ao rastrear localização do motorista:", error);
    }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
    });
}

async function fetchAllData() {
    const { data: drivers, error: driversError } = await supabaseClient.from('drivers').select('*');
    if (driversError) console.error('Error fetching drivers:', driversError); else state.drivers = drivers;
    const { data: users, error: usersError } = await supabaseClient.from('users').select('*');
    if (usersError) console.error('Error fetching users:', usersError); else state.users = users;
    const { data: rides, error: ridesError } = await supabaseClient.from('rides').select('*');
    if (ridesError) console.error('Error fetching rides:', ridesError); else state.rides = rides;
}

async function sendNewRideEmailNotification(ride) {
    console.log('Tentando enviar e-mail para a nova corrida:', ride);

    const RESEND_API_KEY = 're_Zz22Tx4D_E9SBeJHkQ94R8V18uk7nWidg';
    const resend = new Resend(RESEND_API_KEY);

    const destinationEmail = 'contato@garciatransportes.com.br';

    try {
        const subject = `Nova Solicitação de Corrida: ${ride.userName}`;
        const htmlBody = `
            <p>Uma nova solicitação de corrida foi registrada no sistema:</p>
            <ul>
                <li><strong>Usuário:</strong> ${ride.userName} (${ride.userCompany || 'N/A'})</li>
                <li><strong>Origem:</strong> ${ride.origin_address}</li>
                <li><strong>Destino:</strong> ${formatDestination(ride.destination)}</li>
                <li><strong>Tipo:</strong> ${ride.request_type === 'scheduled' ? 'Agendada' : 'Imediata'}</li>
                ${ride.scheduled_datetime ? `<li><strong>Data/Hora Agendada:</strong> ${new Date(ride.scheduled_datetime).toLocaleString('pt-BR')}</li>` : ''}
                <li><strong>Observação:</strong> ${ride.observation || 'Nenhuma'}</li>
            </ul>
            <p>Acesse o painel administrativo para designar um motorista.</p>
        `;

        const { data, error } = await resend.emails.send({
            from: 'Sistema de Notificação <onboarding@resend.dev>',
            to: destinationEmail,
            subject: subject,
            html: htmlBody,
        });

        if (error) {
            console.error('Erro ao enviar e-mail pelo Resend:', error);
        } else {
            console.log('E-mail de notificação enviado com sucesso:', data);
        }

    } catch (error) {
        console.error('Erro ao tentar enviar e-mail:', error);
    }
}

function setupRealtimeSubscriptions() {
    supabaseClient.channel('public:drivers').on('postgres_changes', { event: '*', schema: 'public', table: 'drivers' }, payload => {
        fetchAllData().then(() => {
            const activeScreen = document.querySelector('.screen.active')?.id;
            if (activeScreen === 'admin-driver-crud-screen') renderDriverCrudList();
            else if (activeScreen === 'driver-selection-screen') populateDriverSelection();
            if (activeScreen === 'user-screen') updateAvailableDriversCount();
        });
    }).subscribe();

    supabaseClient.channel('public:users').on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
        fetchAllData().then(() => {
            if (document.querySelector('.screen.active')?.id === 'admin-user-crud-screen') renderUserCrudList();
        });
    }).subscribe();

    supabaseClient.channel('public:rides').on('postgres_changes', { event: '*', schema: 'public', table: 'rides' }, payload => {

        if (localStorage.getItem('sessionType') === 'admin') {
            if (payload.eventType === 'INSERT' && (payload.new.status === 'requested' || payload.new.status === 'scheduled')) {
                startRingingAdmin();
                sendNewRideEmailNotification(payload.new);
            }
            else if (payload.eventType === 'UPDATE' && payload.new.status === 'approved' && payload.old.status !== 'approved') {
                startRingingAdmin();
            }
        }

        fetchAllData().then(() => {
            const activeScreenId = document.querySelector('.screen.active')?.id;
            if (activeScreenId === 'admin-requests-screen') {
                loadAdminRequests();
                renderOngoingRidesTable();
            }
            else if (activeScreenId === 'driver-screen') loadDriverJobs();
            else if (activeScreenId === 'user-screen') {
                checkUserRideStatus();
                updateAvailableDriversCount();
                renderUserRideHistory();
            }
            else if (activeScreenId === 'driver-selection-screen') {
                populateDriverSelection();
            }
            else if (activeScreenId === 'admin-records-screen') {
                loadAllRecords();
            }
        });
    }).subscribe();
}

function updateDriverStatusButton() {
    const driver = state.drivers.find(d => d.id === state.currentDriverId);
    if (!driver) return;
    const toggle = document.getElementById('driver-status-toggle');
    const label = document.getElementById('driver-status-label');
    if (driver.status === 'active') {
        toggle.checked = true;
        label.textContent = 'ATIVO';
        label.className = 'font-bold text-green-400';
    } else {
        toggle.checked = false;
        label.textContent = 'INATIVO';
        label.className = 'font-bold text-red-400';
    }
}

async function toggleDriverStatus() {
    const driver = state.drivers.find(d => d.id === state.currentDriverId);
    if (driver) {
        const newStatus = driver.status === 'active' ? 'inactive' : 'active';
        const { error } = await supabaseClient.from('drivers').update({ status: newStatus }).eq('id', driver.id);
        if (error) console.error("Error updating driver status:", error);
    }
}

async function toggleDriverStatusAdmin(driverId) {
    const driver = state.drivers.find(d => d.id === driverId);
    if (driver) {
        const newStatus = driver.status === 'active' ? 'inactive' : 'active';
        const { error } = await supabaseClient.from('drivers').update({ status: newStatus }).eq('id', driver.id);
        if (error) console.error("Error updating driver status:", error);
    }
}

function updateAvailableDriversCount() {
    const availableDrivers = state.drivers.filter(driver => {
        const hasActiveRide = state.rides.some(ride =>
            ride.driverId === driver.id &&
            ride.status !== 'completed' &&
            ride.status !== 'canceled'
        );
        return driver.status === 'active' && !hasActiveRide;
    });
    const countEl = document.getElementById('available-drivers-count');
    if (countEl) {
        countEl.className = 'text-center mb-4 text-lg text-green-400 font-semibold';
        countEl.textContent = `Motoristas disponíveis agora: ${availableDrivers.length}`;
    }
}

const customDataLabels = {
    id: 'customDataLabels',
    afterDraw(chart, args, options) {
        const { ctx, data } = chart;
        const total = data.datasets[0].data.reduce((acc, current) => acc + current, 0);

        if (total === 0) return;

        const centerX = chart.getDatasetMeta(0).data[0].x;
        const centerY = chart.getDatasetMeta(0).data[0].y;

        ctx.save();
        ctx.font = 'bold 40px Poppins';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, centerX, centerY);
        ctx.restore();
    }
};

function renderDriverStatusChart(active, inactive) {
    const chartElement = document.getElementById('driver-status-chart');
     if (!chartElement) return;
     const ctx = chartElement.getContext('2d');
    if (driverChart) driverChart.destroy();
    driverChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ativos', 'Inativos'],
            datasets: [{
                data: [active, inactive],
                backgroundColor: ['#22c55e', '#ef4444'],
                borderColor: '#374151',
                borderWidth: 5,
                hoverBorderWidth: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
            }
        },
        plugins: [customDataLabels]
    });
}

function translateStatus(status) {
    if (!status) {
        return { text: 'INDEFINIDO', colorClass: 'status-canceled' };
    }
    switch (status) {
        case 'pending_approval': return { text: 'PEND. APROVAÇÃO', colorClass: 'status-pending_approval' };
        case 'approved': return { text: 'APROVADA', colorClass: 'status-approved' };
        case 'rejected': return { text: 'REJEITADA', colorClass: 'status-rejected' };
        case 'requested': return { text: 'SOLICITADO', colorClass: 'status-requested' };
        case 'assigned': return { text: 'DESIGNADO', colorClass: 'status-assigned' };
        case 'accepted': return { text: 'ACEITO', colorClass: 'status-accepted' };
        case 'arrived_pickup': return { text: 'NO EMBARQUE', colorClass: 'status-arrived_pickup' };
        case 'in_progress': return { text: 'EM ANDAMENTO', colorClass: 'status-in_progress' };
        case 'completed': return { text: 'FINALIZADA', colorClass: 'status-completed' };
        case 'canceled': return { text: 'CANCELADA', colorClass: 'status-canceled' };
        default: return { text: status.toUpperCase(), colorClass: '' };
    }
}

function exportDailyReportNow() {
    if (state.rides.length === 0) {
        showModal("Nenhuma corrida encontrada para exportar.");
        return;
    }

    const dataToExport = state.rides.map(ride => ({
        'ID da Corrida': ride.id,
        'Usuário': ride.userName,
        'Empresa': ride.userCompany,
        'Destino': formatDestination(ride.destination),
        'Motorista': ride.driverName || 'N/A',
        'Data da Solicitação': new Date(ride.requestTime).toLocaleString('pt-BR'),
        'Data do Aceite': ride.acceptTime ? new Date(ride.acceptTime).toLocaleString('pt-BR') : 'N/A',
        'Status': translateStatus(ride.status).text
    }));

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio de Corridas");
    XLSX.writeFile(workbook, `Relatorio_Diario_${dateStr}.xlsx`);
}

function renderUserRideHistory() {
    const historyContainer = document.getElementById('user-ride-history');
    historyContainer.innerHTML = '';
    const userRides = state.rides.filter(r => r.userId === state.currentUserId);
    if (userRides.length === 0) {
        historyContainer.innerHTML = '<p class="text-center text-gray-400">Nenhum histórico de corrida.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left';
    table.innerHTML = `
        <thead class="text-xs text-gray-300 uppercase bg-gray-900/30">
            <tr>
                <th scope="col" class="px-4 py-3">Data</th>
                <th scope="col" class="px-4 py-3">Destino</th>
                <th scope="col" class="px-4 py-3">Status</th>
            </tr>
        </thead>`;
    const tbody = document.createElement('tbody');
    userRides.sort((a, b) => new Date(b.requestTime) - new Date(a.requestTime));
    userRides.forEach(ride => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700';
        row.innerHTML = `
            <td class="px-4 py-3">${new Date(ride.requestTime).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-3">${formatDestination(ride.destination)}</td>
            <td class="px-4 py-3">${translateStatus(ride.status).text}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    historyContainer.appendChild(table);
}

function renderDriverRideHistory() {
    const historyContainer = document.getElementById('driver-ride-history');
    historyContainer.innerHTML = '';
    const driverRides = state.rides.filter(r => r.driverId === state.currentDriverId && r.status === 'completed');
    if (driverRides.length === 0) {
        historyContainer.innerHTML = '<p class="text-center text-gray-400">Nenhum histórico de corrida.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'w-full text-sm text-left';
    table.innerHTML = `
        <thead class="text-xs text-gray-300 uppercase bg-gray-900/30">
            <tr>
                <th scope="col" class="px-4 py-3">Data</th>
                <th scope="col" class="px-4 py-3">Usuário</th>
                <th scope="col" class="px-4 py-3">Destino</th>
            </tr>
        </thead>`;
    const tbody = document.createElement('tbody');
    driverRides.sort((a, b) => new Date(b.requestTime) - new Date(a.requestTime));
    driverRides.forEach(ride => {
        const row = document.createElement('tr');
        row.className = 'border-b border-gray-700';
        row.innerHTML = `
            <td class="px-4 py-3">${new Date(ride.requestTime).toLocaleDateString('pt-BR')}</td>
            <td class="px-4 py-3">${ride.userName}</td>
            <td class="px-4 py-3">${formatDestination(ride.destination)}</td>
        `;
        tbody.appendChild(row);
    });
    table.appendChild(tbody);
    historyContainer.appendChild(table);
}

function exportUserRidesToExcel() {
    const userRides = state.rides.filter(r => r.userId === state.currentUserId);
    if (userRides.length === 0) { showModal("Nenhum histórico de corrida para exportar."); return; }

    const dataToExport = userRides.map(ride => ({
        'Data da Solicitação': new Date(ride.requestTime).toLocaleString('pt-BR'),
        'Destino': formatDestination(ride.destination),
        'Motorista': ride.driverName || 'N/A',
        'Status': translateStatus(ride.status).text
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Minhas Corridas");
    XLSX.writeFile(workbook, "meu_historico_corridas.xlsx");
}

function exportDriverRidesToExcel() {
    const driverRides = state.rides.filter(r => r.driverId === state.currentDriverId && r.status === 'completed');
    if (driverRides.length === 0) { showModal("Nenhum histórico de corrida para exportar."); return; }

    const dataToExport = driverRides.map(ride => ({
        'Data da Solicitação': new Date(ride.requestTime).toLocaleString('pt-BR'),
        'Usuário': ride.userName,
        'Empresa': ride.userCompany,
        'Destino': formatDestination(ride.destination),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Minhas Corridas Concluídas");
    XLSX.writeFile(workbook, "meu_historico_corridas_concluidas.xlsx");
}

function openRecordsTab() {
    showScreen('admin-records-screen');
}

async function loadAllRecords() {
    const tableBody = document.getElementById('all-records-body');
    tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4"><div class="loader mx-auto"></div></td></tr>';

    const { data, error } = await supabaseClient.from('rides').select('*').order('requestTime', { ascending: false });
    if (error) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-red-500">Erro ao carregar registros.</td></tr>';
        return;
    }
    state.rides = data;

    const companySelect = document.getElementById('records-company-filter');
    if (companySelect) {
        companySelect.innerHTML = '<option value="" class="text-gray-400">Todas as Empresas</option>';
        const companies = [...new Set(data.map(ride => ride.userCompany || '-').filter(Boolean))];
        companies.sort().forEach(company => {
            if (company && company !== '-') {
                companySelect.innerHTML += `<option value="${company}" class="text-white">${company}</option>`;
            }
        });
    }

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="text-center py-4 text-gray-400">Nenhum registro encontrado.</td></tr>';
        return;
    }

    const formatRideDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            return 'Data Inválida';
        }
    };

    const rowsHTML = data.map((ride) => {
        let distanceKm = ride.km || 'N/A';
        const originAddress = cleanAddressString(ride.origin_address) || '-';
        const destinationAddress = formatDestination(ride.destination);
        const statusInfo = translateStatus(ride.status);
        const requestDateTime = formatRideDate(ride.requestTime);
        const scheduledDateTime = formatRideDate(ride.scheduled_datetime);
        const acceptDateTime = formatRideDate(ride.acceptTime);
        const observation = ride.observation || '-';
        const requestTimestamp = ride.requestTime ? new Date(ride.requestTime).getTime() : 0;

        return `
            <tr class="border-b border-gray-700 hover:bg-gray-800/20" data-request-time="${requestTimestamp}">
                <td class="px-4 py-3">${requestDateTime}</td>
                <td class="px-4 py-3">${scheduledDateTime}</td>
                <td class="px-4 py-3">${acceptDateTime}</td>
                <td class="px-4 py-3">${ride.userName}</td>
                <td class="px-4 py-3">${ride.userCompany || '-'}</td>
                <td class="px-4 py-3">${originAddress}</td>
                <td class="px-4 py-3">${destinationAddress}</td>
                <td class="px-4 py-3">${observation}</td>
                <td class="px-4 py-3">${ride.driverName || '-'}</td>
                <td class="px-4 py-3"><span class="status-badge ${statusInfo.colorClass}">${statusInfo.text}</span></td>
                <td class="px-4 py-3">${distanceKm}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = rowsHTML.join('');
}

function filterRecords() {
    const startDate = document.getElementById('records-start-date').value;
    const endDate = document.getElementById('records-end-date').value;
    const selectedCompany = document.getElementById('records-company-filter').value;
    const tableBody = document.getElementById('all-records-body');
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    const start = startDate ? new Date(startDate).getTime() : null;
    const end = endDate ? new Date(endDate).setHours(23, 59, 59, 999) : null;

    rows.forEach(row => {
        const requestTimestamp = row.dataset.requestTime;
        const companyCell = row.cells[4];

        if (requestTimestamp && companyCell) {
            const recordDate = parseInt(requestTimestamp);
            let dateMatch = true;
            if (start && recordDate < start) dateMatch = false;
            if (end && recordDate > end) dateMatch = false;

            const rowCompany = companyCell.textContent.trim();
            let companyMatch = (selectedCompany === "" || rowCompany === selectedCompany || (selectedCompany === '-' && rowCompany === '-'));

            row.style.display = (dateMatch && companyMatch) ? '' : 'none';
        } else {
             row.style.display = 'none';
        }
    });
}

function exportRecordsToExcel() {
    const table = document.getElementById('all-records-table');
    const rows = table.querySelectorAll('tbody tr');
    const dataToExport = [];

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    dataToExport.push(headers);

    let visibleRows = 0;
    rows.forEach(row => {
        if (row.style.display !== 'none') {
            const cells = Array.from(row.querySelectorAll('td')).map(td => {
                if (td.querySelector('.status-badge')) {
                    return td.querySelector('.status-badge').textContent.trim();
                }
                return td.textContent.trim();
            });
            dataToExport.push(cells);
            visibleRows++;
        }
    });

    if (visibleRows === 0) {
        showModal("Nenhum registro (visível) encontrado para exportar. Verifique seus filtros.");
        return;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Registros");

    worksheet['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
        { wch: 40 },
        { wch: 40 },
        { wch: 30 },
        { wch: 25 },
        { wch: 15 },
        { wch: 15 }
    ];

    XLSX.writeFile(workbook, "relatorio_de_registros.xlsx");
}

function clearRecordsFilter() {
    document.getElementById('records-start-date').value = '';
    document.getElementById('records-end-date').value = '';
    document.getElementById('records-company-filter').value = '';

    const tableBody = document.getElementById('all-records-body');
    const rows = Array.from(tableBody.querySelectorAll('tr'));

    rows.forEach(row => {
        row.style.display = '';
    });
}

async function adminCompleteRide(rideId) {
    if (!confirm('Tem certeza que deseja finalizar esta corrida?')) return;

    const ride = state.rides.find(r => r.id === rideId);
    let finalDistance = null;

    if (ride && ride.origin_address && ride.destination) {
        try {
            const distance = await getDrivingDistance(ride.origin_address, formatDestination(ride.destination));
            if (distance !== null) {
                finalDistance = distance.toFixed(2);
            }
        } catch (e) {
            console.error("Erro ao calcular distância final (admin):", e);
        }
    }

    const { error } = await supabaseClient
        .from('rides')
        .update({
            status: 'completed',
            km: finalDistance
        })
        .eq('id', rideId);

    if (error) alert('Não foi possível finalizar a corrida.');
    else alert('Corrida finalizada com sucesso!');
}

async function adminDeleteRide(rideId) {
    if (!confirm('ATENÇÃO: Ação irreversível. Deseja realmente excluir esta corrida?')) return;
    const { error } = await supabaseClient.from('rides').delete().eq('id', rideId);
    if (error) alert('Não foi possível excluir a corrida.');
    else alert('Corrida excluída com sucesso!');
}

async function initApp() {
    if (!supabaseClient) {
         console.error("Supabase client not initialized yet in initApp!");
         return;
    }
    await fetchAllData();
    setupRealtimeSubscriptions();
    loadAppIcon();

    const sessionType = localStorage.getItem('sessionType');
    if (sessionType === 'admin') {
        showScreen('admin-screen');
    } else if (sessionType === 'user') {
        const userId = localStorage.getItem('loggedInUserId');
        if (userId && state.users.some(u => u.id == userId)) {
            state.currentUserId = parseInt(userId);
            showScreen('user-screen');
        } else {
            logout();
        }
    } else if (sessionType === 'driver') {
        const driverId = localStorage.getItem('loggedInDriverId');
        if (driverId && state.drivers.some(d => d.id == driverId)) {
            state.currentDriverId = parseInt(driverId);
            const driver = state.drivers.find(d => d.id === state.currentDriverId);
            if(driver) {
                 document.getElementById('driver-name-display').textContent = `Bem-vindo, ${driver.name}`;
                 updateDriverStatusButton();
                 showScreen('driver-screen');
            } else {
                 logout();
            }
        } else {
            logout();
        }
    } else {
        showScreen('initial-screen');
    }
}

async function geocodeAddress(address) {
    if (!address || typeof address !== 'string' || address.trim().length < 3) {
        console.warn(`Tentativa de geocodificar endereço inválido ou vazio: '${address}'`);
        return null;
    }

    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(address)}&filter=countrycode:br&lang=pt&apiKey=${GEOAPIFY_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const coords = data.features[0].geometry.coordinates;
            return { lat: coords[1], lon: coords[0] };
        } else {
            const newAddress = `${address}, Guaíba, RS`;
            console.log(`Primeira tentativa falhou para '${address}', tentando com '${newAddress}'`);
            const fallbackUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(newAddress)}&filter=countrycode:br&lang=pt&apiKey=${GEOAPIFY_API_KEY}`;

            const fallbackResponse = await fetch(fallbackUrl);
            const fallbackData = await fallbackResponse.json();

            if (fallbackData.features && fallbackData.features.length > 0) {
                const coords = fallbackData.features[0].geometry.coordinates;
                return { lat: coords[1], lon: coords[0] };
            } else {
                console.warn(`A segunda geocodificação (fallback) também falhou para: '${newAddress}'. Endereço original: '${address}'`);
                return null;
            }
        }
    } catch (error) {
        console.error(`Erro na chamada da API de geocodificação para: '${address}'`, error);
        return null;
    }
}

async function initHeatmap() {
    const mapDiv = document.getElementById('heatmap-canvas');
    if (!mapDiv) {
        console.error('Elemento do mapa não encontrado');
        return;
    }

    if (map && map.remove) {
        map.off();
        map.remove();
        map = null;
    }

    const center = [-30.1118, -51.3255];

    try {
        map = L.map(mapDiv, { preferCanvas: true }).setView(center, 13);

        L.tileLayer(`https://maps.geoapify.com/v1/tile/dark-matter/{z}/{x}/{y}.png?apiKey=${GEOAPIFY_API_KEY}`, {
            attribution: 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a>',
            maxZoom: 19
        }).addTo(map);

        console.log('Mapa Leaflet inicializado, aguardando...');

        setTimeout(async () => {
            try {
                console.log('Buscando endereços dos usuários para heatmap...');

                const geocodePromises = state.users
                    .filter(user => user.address && user.address.trim() !== '')
                    .map(user => geocodeAddress(user.address));

                const results = await Promise.all(geocodePromises);

                const locationsData = results
                    .filter(coords => coords !== null)
                    .map(coords => [coords.lat, coords.lon]);

                console.log(`Total de coordenadas válidas para o heatmap: ${locationsData.length}`);

                if (locationsData.length > 0) {
                    if (heatmap && map.hasLayer(heatmap)) {
                        map.removeLayer(heatmap);
                        heatmap = null;
                    }

                    heatmap = L.heatLayer(locationsData, {
                        radius: 50,
                        blur: 25,
                        maxZoom: 18,
                        gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1: 'red' },
                        minOpacity: 0.1
                    }).addTo(map);

                    if (locationsData.length > 1) {
                        try {
                            const bounds = L.latLngBounds(locationsData);
                            if(bounds.isValid()){
                                 map.fitBounds(bounds.pad(0.1));
                            } else {
                                 console.warn("Bounds inválidos calculados, centrando no primeiro ponto.");
                                 map.setView(locationsData[0], 15);
                            }
                        } catch (boundsError) {
                             console.warn("Erro ao calcular bounds, mantendo visão inicial:", boundsError);
                             map.setView(center, 13);
                        }
                    } else if (locationsData.length === 1) {
                         map.setView(locationsData[0], 15);
                    } else {
                         map.setView(center, 13);
                    }

                } else {
                    console.warn('Nenhuma coordenada válida encontrada para gerar o mapa de calor.');
                }
            } catch (heatmapError) {
                 console.error('Erro ao processar dados ou adicionar heatmap:', heatmapError);
                 showModal('Erro ao gerar a camada de calor. Verifique o console.');
            }
        }, 500);

    } catch (error) {
        console.error('Erro ao inicializar o mapa Leaflet:', error);
        showModal('Erro ao carregar o mapa base. Verifique o console para detalhes.');
    }
}

async function getDrivingDistance(originAddress, destinationAddress) {
    let originCoords, destCoords;
    try {
         const cleanOrigin = cleanAddressString(originAddress);
         const cleanDestination = formatDestination(destinationAddress);

         if (!cleanOrigin || !cleanDestination || cleanDestination === '-') {
              throw new Error('Endereço de origem ou destino inválido após limpeza');
         }

        originCoords = await geocodeAddress(cleanOrigin);
        if (!originCoords) throw new Error(`Falha ao geocodificar origem: ${cleanOrigin}`);

        destCoords = await geocodeAddress(cleanDestination);
        if (!destCoords) throw new Error(`Falha ao geocodificar destino: ${cleanDestination}`);

    } catch (error) {
        console.error('Erro na geocodificação para cálculo de distância:', error.message);
        return null;
    }

    return await getDrivingDistanceByCoords(originCoords, destCoords);
}

async function getDrivingDistanceByCoords(originCoords, destCoords) {
    if (!originCoords || typeof originCoords.lat === 'undefined' || typeof originCoords.lon === 'undefined' ||
        !destCoords || typeof destCoords.lat === 'undefined' || typeof destCoords.lon === 'undefined') {
        console.warn("getDrivingDistanceByCoords: Coordenadas inválidas.", originCoords, destCoords);
        return null;
    }

    const waypoints = `${originCoords.lat},${originCoords.lon}|${destCoords.lat},${destCoords.lon}`;
    const url = `https://api.geoapify.com/v1/routing?waypoints=${encodeURIComponent(waypoints)}&mode=drive&units=metric&apiKey=${GEOAPIFY_API_KEY}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.features && data.features.length > 0) {
            const distanceInMeters = data.features[0].properties.distance;
            return distanceInMeters / 1000;
        } else {
            console.error('Erro na API de Roteamento Geoapify:', data);
             const R = 6371;
             const dLat = (destCoords.lat - originCoords.lat) * Math.PI / 180;
             const dLon = (destCoords.lon - originCoords.lon) * Math.PI / 180;
             const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                       Math.cos(originCoords.lat * Math.PI / 180) * Math.cos(destCoords.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
             const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
             const fallbackDistance = R * c;
             console.warn(`API de roteamento falhou, usando distância em linha reta: ${fallbackDistance.toFixed(2)} km`);
             return fallbackDistance;
        }
    } catch (error) {
        console.error('Erro ao buscar a distância (Geoapify):', error);
        return null;
    }
}

function formatDestination(destinationString) {
    if (typeof destinationString !== 'string' || !destinationString.trim()) return '-';

    let formattedAddress = '-';
    const trimmedString = destinationString.trim();

    if (trimmedString.startsWith('[{') && trimmedString.endsWith('}]')) {
        try {
            const destinationsArray = JSON.parse(trimmedString);
            if (Array.isArray(destinationsArray)) {
                const addresses = destinationsArray
                    .map(dest => dest.address || '')
                    .filter(Boolean);
                if (addresses.length > 0) {
                    formattedAddress = addresses.join(' - ');
                }
            }
        } catch (e) {
            console.warn("Could not parse complex destination JSON, falling back:", trimmedString, e);
            const regexAddresses = trimmedString.match(/"address":"(.*?)"/g);
            if (regexAddresses) {
                formattedAddress = regexAddresses.map(match => match.replace(/"address":"(.*)"/,'$1')).join(' - ');
            } else {
                formattedAddress = trimmedString.replace(/[\[\]\{\}"]/g, '').replace(/name:.*?,address:/g, '').replace(/,/g, ' - ').trim();
            }
        }
    }
    else {
        formattedAddress = trimmedString.replace(/^\["|"\]$/g, '').trim();
    }

    return formattedAddress || '-';
}

let debounceTimer;

function handleAddressInput(event, listId) {
    clearTimeout(debounceTimer);
    const query = event.target.value;
    debounceTimer = setTimeout(() => {
        searchAddress(query, listId);
    }, 300);
}

async function searchAddress(query, listId) {
    if (query.length < 3) {
        hideList(listId);
        return;
    }

    const list = document.getElementById(listId);
    if (!list) return;

    const inputId = listId.replace('List', '');
    const input = document.getElementById(inputId);
    if (input) {
        input.removeAttribute('data-address-valid');
    }

    list.innerHTML = '<div class="loading">Buscando...</div>';
    list.classList.add('show');

    try {
        const response = await fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(query)}&lang=pt&limit=5&apiKey=${GEOAPIFY_API_KEY}`
        );

        const data = await response.json();

        if (data.features && data.features.length > 0) {
            displayResults(data.features, listId);
        } else {
            list.innerHTML = '<div class="no-results">Nenhum resultado encontrado</div>';
        }
    } catch (error) {
        console.error('Erro ao buscar endereços:', error);
        list.innerHTML = '<div class="no-results">Erro ao buscar endereços</div>';
    }
}

function displayResults(features, listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    list.innerHTML = '';

    features.forEach(feature => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';

        const formatted = feature.properties.formatted;
        const city = feature.properties.city || '';
        const state = feature.properties.state || '';

        item.innerHTML = `
            <strong>${formatted}</strong>
            ${city || state ? `<br><small style="color: #999;">${city}${city && state ? ', ' : ''}${state}</small>` : ''}
        `;

        item.onclick = () => selectAddress(feature, listId);
        list.appendChild(item);
    });

    list.classList.add('show');
}

function selectAddress(feature, listId) {
    const inputId = listId.replace('List', '');
    const input = document.getElementById(inputId);

    if (input) {
        input.value = feature.properties.formatted;
        input.setAttribute('data-address-valid', 'true');
         if (inputId === 'origin') {
             state.currentUserOrigin = feature;
         } else if (inputId === 'destination') {
             state.currentUserDestination = feature;
         }
    }
    hideList(listId);
}

function hideList(listId) {
    const list = document.getElementById(listId);
    if (list) {
        list.classList.remove('show');
    }
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.autocomplete-container')) {
        document.querySelectorAll('.autocomplete-list').forEach(list => list.classList.remove('show'));
    }
});

document.addEventListener('DOMContentLoaded', () => {
     loadAppIcon();

     if (typeof supabase === 'undefined') {
         console.error("Supabase library not loaded!");
         const container = document.getElementById('app-container') || document.body;
         container.innerHTML = `<div class="p-4 text-center text-red-700 bg-red-100 border border-red-400 rounded">Erro crítico: Não foi possível carregar a biblioteca de banco de dados (Supabase). Verifique sua conexão com a internet e atualize a página.</div>`;
     } else {
         supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
         initApp();
     }
});
