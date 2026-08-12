// ============================================
// VIDEOLLAMADA.JS - CON TURN SERVERS Y WEBSOCKET
// ============================================

// Configuración de Socket.IO
const socket = io({
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5
});

/**
 * Clase principal de la videollamada
 */
class VideoCallApp {
    constructor() {
        // ============================================
        // CONFIGURACIÓN ICE CON TURN SERVERS
        // ============================================
        this.config = {
            iceServers: [
                // STUN servers (para encontrar IP pública)
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                
                // ✅ TURN servers (para relay cuando STUN falla - necesario para datos móviles)
                { 
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                { 
                    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ],
            // Configuración adicional para mejor conexión
            iceTransportPolicy: 'all',
            iceCandidatePoolSize: 10,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        };

        // Estado
        this.localStream = null;
        this.screenStream = null;
        this.isScreenSharing = false;
        this.isAudioMuted = false;
        this.isVideoMuted = false;
        this.peerConnection = null;
        this.salaId = null;
        this.usuario = null;
        this.remoteConnected = false;
        this.connecting = false;
        this.participants = [];
        this.hasSentOffer = false;

        // Elementos DOM
        this.localVideo = document.getElementById('video-local');
        this.remoteVideo = document.getElementById('video-remoto');
        this.remotePlaceholder = document.getElementById('remotePlaceholder');
        this.remoteLabel = document.getElementById('remoteLabel');
        this.remoteStatus = document.getElementById('remoteStatus');
        this.localStatus = document.getElementById('localStatus');
        this.participantesCount = document.getElementById('participantesCount');
        this.salaIdDisplay = document.getElementById('salaIdDisplay');

        // Inicializar
        this.init();
    }

    // ============================================
    // INICIALIZACIÓN
    // ============================================
    async init() {
        const params = new URLSearchParams(window.location.search);
        this.salaId = params.get('sala');

        if (!this.salaId) {
            this.showToast('❌ No se proporcionó un ID de sala', 'error');
            setTimeout(() => window.location.href = '/dashboard.html', 2000);
            return;
        }

        this.salaIdDisplay.textContent = this.salaId;

        try {
            this.usuario = JSON.parse(localStorage.getItem('usuario'));
            if (!this.usuario || !this.usuario._id) {
                this.showToast('❌ Debes iniciar sesión primero', 'error');
                setTimeout(() => window.location.href = '/iniciar_sesion.html', 2000);
                return;
            }
        } catch (e) {
            this.showToast('❌ Error al obtener datos del usuario', 'error');
            return;
        }

        this.setupSocket();
        await this.getUserMedia();
        this.setupControls();
        this.registrarActividad('videollamada', `Entró a la sala ${this.salaId}`);
    }

    // ============================================
    // SOCKET.IO
    // ============================================
    setupSocket() {
        socket.connect();

        socket.emit('join_room', {
            sala_id: this.salaId,
            usuario_id: this.usuario._id,
            usuario_nombre: this.usuario.nombre
        });

        socket.on('participantes_actualizados', (data) => {
            this.participants = data.participantes || [];
            this.participantesCount.textContent = data.total || 0;
            console.log('👥 Participantes:', this.participants);

            if (this.participants.length > 1 && !this.remoteConnected && !this.connecting && !this.hasSentOffer) {
                console.log('🚀 Iniciando llamada...');
                setTimeout(() => {
                    this.startCall();
                }, 500);
            }
        });

        socket.on('signal', (data) => {
            if (data.from_id === this.usuario._id) return;
            console.log('📩 Señal recibida de:', data.from_id, 'tipo:', data.signal?.type);
            this.handleSignal(data);
        });

        socket.on('esperando_participante', (data) => {
            this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#f59e0b;"></i> Esperando participante...';
            this.showToast('⏳ Esperando que alguien se una...', 'info');
        });

        socket.on('sala_cerrada', () => {
            this.showToast('🔴 La sala se ha cerrado', 'error');
            setTimeout(() => this.endCall(), 1000);
        });

        socket.on('connect', () => {
            console.log('🔌 Conectado al servidor WebSocket');
            socket.emit('join_room', {
                sala_id: this.salaId,
                usuario_id: this.usuario._id,
                usuario_nombre: this.usuario.nombre
            });
        });

        socket.on('disconnect', () => {
            console.log('🔌 Desconectado del servidor WebSocket');
            this.showToast('⚠️ Conexión perdida, reconectando...', 'error');
        });
    }

    // ============================================
    // OBTENER MEDIA
    // ============================================
    async getUserMedia() {
        try {
            // Para celular: resolución más baja para mejor rendimiento
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            const constraints = {
                video: {
                    width: { ideal: isMobile ? 320 : 640 },
                    height: { ideal: isMobile ? 240 : 480 },
                    facingMode: 'user'
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.localVideo.srcObject = this.localStream;
            await this.localVideo.play();

            console.log('✅ Cámara y micrófono activados');
            this.showToast('🎥 Cámara y micrófono activados', 'success');

        } catch (error) {
            console.error('❌ Error al acceder a la cámara/micrófono:', error);
            
            try {
                this.showToast('📱 Intentando solo audio...', 'info');
                const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
                this.localStream = audioOnly;
                this.showToast('🎤 Solo audio disponible', 'info');
            } catch (audioError) {
                this.showToast('❌ No se pudo acceder a la cámara o micrófono', 'error');
            }
        }
    }

    // ============================================
    // CREAR PEER CONNECTION
    // ============================================
    createPeerConnection() {
        const pc = new RTCPeerConnection(this.config);
        console.log('🔄 Creando PeerConnection con TURN servers');

        // Manejar tracks remotos
        pc.ontrack = (event) => {
            console.log('🎥 ONTRACK DISPARADO');
            console.log('  📦 Track:', event.track?.kind);
            console.log('  📦 Streams:', event.streams);
            
            if (event.streams && event.streams.length > 0) {
                const remoteStream = event.streams[0];
                console.log('✅ Stream remoto recibido!');
                
                this.remoteVideo.srcObject = remoteStream;
                this.remoteVideo.play()
                    .then(() => {
                        console.log('▶️ Video remoto reproduciéndose');
                        this.remoteConnected = true;
                        this.connecting = false;
                        this.remotePlaceholder.style.display = 'none';
                        this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#10b981;"></i> Conectado';
                        this.remoteLabel.textContent = '👤 Participante';
                        this.participantesCount.textContent = '2';
                        this.showToast('👤 Participante conectado', 'success');
                    })
                    .catch(e => console.warn('Error al reproducir video remoto:', e));
            } else {
                console.warn('⚠️ ontrack sin streams');
            }
        };

        // Manejar candidatos ICE
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                console.log('🧊 Enviando candidato ICE');
                socket.emit('signal', {
                    sala_id: this.salaId,
                    from_id: this.usuario._id,
                    signal: {
                        type: 'candidate',
                        candidate: event.candidate
                    }
                });
            }
        };

        // Manejar estado de conexión
        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            console.log('🔗 Estado de conexión:', state);
            
            if (state === 'connected') {
                this.remoteConnected = true;
                this.connecting = false;
                this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#10b981;"></i> Conectado';
                console.log('✅ Conexión WebRTC establecida');
            } else if (state === 'failed') {
                this.remoteConnected = false;
                this.connecting = false;
                this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#ef4444;"></i> Conexión fallida';
                this.showToast('⚠️ Conexión fallida', 'error');
            } else if (state === 'disconnected') {
                this.remoteConnected = false;
                this.connecting = false;
                this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#ef4444;"></i> Desconectado';
                this.showToast('⚠️ Conexión perdida', 'error');
            }
        };

        // Manejar errores ICE
        pc.onicecandidateerror = (event) => {
            console.warn('⚠️ Error ICE:', event);
        };

        // Agregar tracks locales
        if (this.localStream) {
            console.log('📤 Agregando tracks locales');
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
                console.log(`  ➕ Track agregado: ${track.kind}`);
            });
        }

        return pc;
    }

    // ============================================
    // INICIAR LLAMADA (crear oferta)
    // ============================================
    async startCall() {
        if (this.connecting || this.remoteConnected || this.hasSentOffer) {
            console.log('⚠️ No se puede iniciar llamada:', { 
                connecting: this.connecting, 
                remoteConnected: this.remoteConnected, 
                hasSentOffer: this.hasSentOffer 
            });
            return;
        }
        
        console.log('🚀 Iniciando llamada como oferente');
        this.connecting = true;
        this.hasSentOffer = true;
        this.remoteStatus.innerHTML = '<i class="fas fa-circle" style="color:#f59e0b;"></i> Conectando...';

        try {
            // Crear conexión
            this.peerConnection = this.createPeerConnection();

            // Crear oferta
            const offer = await this.peerConnection.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: true
            });
            await this.peerConnection.setLocalDescription(offer);
            console.log('📤 Oferta creada y establecida');

            // Enviar oferta
            socket.emit('signal', {
                sala_id: this.salaId,
                from_id: this.usuario._id,
                signal: {
                    type: 'offer',
                    sdp: offer
                }
            });
            console.log('📤 Oferta enviada al servidor');

        } catch (error) {
            console.error('❌ Error al iniciar llamada:', error);
            this.connecting = false;
            this.hasSentOffer = false;
            this.showToast('❌ Error al conectar', 'error');
        }
    }

    // ============================================
    // MANEJAR SEÑAL
    // ============================================
    async handleSignal(data) {
        const signal = data.signal;
        console.log('📩 Procesando señal:', signal.type);

        try {
            if (signal.type === 'offer') {
                console.log('📩 Recibida oferta, respondiendo...');
                
                if (!this.peerConnection) {
                    console.log('🔄 Creando nueva PeerConnection para responder');
                    this.peerConnection = this.createPeerConnection();
                }

                await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                console.log('📥 Descripción remota establecida');

                const answer = await this.peerConnection.createAnswer({
                    offerToReceiveVideo: true,
                    offerToReceiveAudio: true
                });
                await this.peerConnection.setLocalDescription(answer);
                this.hasSentOffer = true;
                console.log('📤 Respuesta creada');

                socket.emit('signal', {
                    sala_id: this.salaId,
                    from_id: this.usuario._id,
                    signal: {
                        type: 'answer',
                        sdp: answer
                    }
                });
                console.log('📤 Respuesta enviada');

            } else if (signal.type === 'answer') {
                console.log('📩 Recibida respuesta');
                if (this.peerConnection) {
                    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                    console.log('✅ Conexión establecida (respuesta procesada)');
                } else {
                    console.warn('⚠️ No hay PeerConnection para la respuesta');
                }

            } else if (signal.type === 'candidate') {
                console.log('🧊 Recibido candidato ICE');
                if (this.peerConnection && signal.candidate) {
                    try {
                        await this.peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));
                        console.log('🧊 Candidato ICE agregado correctamente');
                    } catch (error) {
                        console.warn('Error al agregar candidato ICE:', error);
                    }
                }
            }

        } catch (error) {
            console.error('❌ Error al manejar señal:', error);
            this.showToast('❌ Error en la conexión', 'error');
        }
    }

    // ============================================
    // CONFIGURAR CONTROLES
    // ============================================
    setupControls() {
        document.getElementById('btnAudio').addEventListener('click', () => {
            this.isAudioMuted = !this.isAudioMuted;
            
            if (this.localStream) {
                this.localStream.getAudioTracks().forEach(track => {
                    track.enabled = !this.isAudioMuted;
                });
            }

            const btn = document.getElementById('btnAudio');
            btn.classList.toggle('active');
            btn.innerHTML = this.isAudioMuted 
                ? '<i class="fas fa-microphone-slash"></i><span>Mic</span>' 
                : '<i class="fas fa-microphone"></i><span>Mic</span>';

            this.showToast(this.isAudioMuted ? '🔇 Micrófono silenciado' : '🎤 Micrófono activado', 'info');
        });

        document.getElementById('btnVideo').addEventListener('click', () => {
            this.isVideoMuted = !this.isVideoMuted;
            
            if (this.localStream) {
                this.localStream.getVideoTracks().forEach(track => {
                    track.enabled = !this.isVideoMuted;
                });
            }

            const btn = document.getElementById('btnVideo');
            btn.classList.toggle('active');
            btn.innerHTML = this.isVideoMuted 
                ? '<i class="fas fa-video-slash"></i><span>Cámara</span>' 
                : '<i class="fas fa-video"></i><span>Cámara</span>';

            this.localStatus.innerHTML = this.isVideoMuted
                ? '<i class="fas fa-circle" style="color:#ef4444;"></i> Cámara apagada'
                : '<i class="fas fa-circle" style="color:#10b981;"></i> Conectado';

            this.showToast(this.isVideoMuted ? '📷 Cámara apagada' : '📷 Cámara activada', 'info');
        });

        document.getElementById('btnScreen').addEventListener('click', async () => {
            if (this.isScreenSharing) {
                this.stopScreenSharing();
            } else {
                await this.startScreenSharing();
            }
        });

        document.getElementById('btnEndCall').addEventListener('click', () => {
            this.endCall();
        });

        document.getElementById('btnSalir').addEventListener('click', () => {
            this.endCall();
        });
    }

    // ============================================
    // COMPARTIR PANTALLA
    // ============================================
    async startScreenSharing() {
        try {
            this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: 'always' },
                audio: false
            });

            const videoTrack = this.screenStream.getVideoTracks()[0];
            
            if (this.localStream) {
                const videoSender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
                
                const newStream = new MediaStream();
                this.localStream.getAudioTracks().forEach(track => newStream.addTrack(track));
                newStream.addTrack(videoTrack);
                this.localStream = newStream;
                this.localVideo.srcObject = this.localStream;
            }
            
            this.isScreenSharing = true;
            const btn = document.getElementById('btnScreen');
            btn.innerHTML = '<i class="fas fa-desktop"></i><span>Detener</span>';
            btn.classList.add('active');

            this.showToast('🖥️ Compartiendo pantalla', 'success');

            videoTrack.onended = () => {
                this.stopScreenSharing();
            };

        } catch (error) {
            console.error('❌ Error al compartir pantalla:', error);
            if (error.name !== 'AbortError') {
                this.showToast('❌ No se pudo compartir la pantalla', 'error');
            }
        }
    }

    stopScreenSharing() {
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }

        if (this.localStream) {
            const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
            navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: isMobile ? 320 : 640 }, height: { ideal: isMobile ? 240 : 480 } },
                audio: false
            }).then(stream => {
                const videoTrack = stream.getVideoTracks()[0];
                const newStream = new MediaStream();
                this.localStream.getAudioTracks().forEach(track => newStream.addTrack(track));
                newStream.addTrack(videoTrack);
                this.localStream = newStream;
                this.localVideo.srcObject = this.localStream;
                
                const videoSender = this.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                }
            }).catch(error => {
                console.error('Error al volver a la cámara:', error);
            });
        }

        this.isScreenSharing = false;
        const btn = document.getElementById('btnScreen');
        btn.innerHTML = '<i class="fas fa-desktop"></i><span>Pantalla</span>';
        btn.classList.remove('active');
        this.showToast('🖥️ Dejó de compartir pantalla', 'info');
    }

    // ============================================
    // TERMINAR LLAMADA
    // ============================================
    endCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
        }

        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }

        socket.emit('leave_room', {
            sala_id: this.salaId,
            usuario_id: this.usuario._id
        });

        socket.disconnect();

        this.registrarActividad('videollamada', `Salió de la sala ${this.salaId}`);

        this.showToast('👋 Saliendo de la videollamada...', 'info');

        setTimeout(() => {
            window.location.href = '/dashboard.html';
        }, 500);
    }

    // ============================================
    // REGISTRAR ACTIVIDAD
    // ============================================
    async registrarActividad(tipo, descripcion) {
        try {
            await fetch('/api/registrar-actividad', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario_id: this.usuario._id,
                    tipo: tipo,
                    descripcion: descripcion
                })
            });
        } catch (error) {
            console.error('Error al registrar actividad:', error);
        }
    }

    // ============================================
    // TOAST
    // ============================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 2800);
    }
}

// ============================================
// INICIAR
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    const app = new VideoCallApp();
});