import {Component, OnDestroy, OnInit, AfterViewInit, NgZone, ChangeDetectorRef} from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  shape: 'diamond' | 'dot';
  drift: number;
  driftSpeed: number;
}

@Component({
  selector: 'home',
  standalone: true,
  imports: [
    CommonModule,
    NgOptimizedImage
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit, OnDestroy, AfterViewInit {

  // ─── COUNTDOWN ───────────────────────────────
  // Data do casamento: 11 de Outubro de 2026 às 16:00
  targetDate = new Date('2026-10-11T16:00:00').getTime();

  days    = '00';
  hours   = '00';
  minutes = '00';
  seconds = '00';

  private timerInterval: any;

  // ─── VÉU STATE ────────────────────────────────
  veilRevealed = false;

  // ─── MÚSICA STATE ────────────────────────────
  isPlaying     = false;
  progressWidth = 0;
  private musicInterval: any;
  audio = new Audio('assets/audios/um.amor.puro.violao.mp3');

  // ─── SCROLL REVEAL ───────────────────────────
  private observer: IntersectionObserver | null = null;

  // ─── PARTÍCULAS ──────────────────────────────
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private animFrame: number | null = null;

  showScrollIndicator = false;

  constructor(
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.audio.load();
  }

  // ─── LIFECYCLE ───────────────────────────────
  ngOnInit(): void {
    history.scrollRestoration = 'manual';

    setTimeout(() => {
      window.scrollTo(0, 0);
    });

    document.body.style.overflow = 'hidden';


    this.startCountdown();

    this.audio.addEventListener('timeupdate', () => {

      if (this.audio.duration) {

        this.progressWidth =
          (this.audio.currentTime / this.audio.duration) * 100;

        const progressFill =
          document.getElementById('progressFill');

        if (progressFill) {
          progressFill.style.width =
            this.progressWidth + '%';
        }
      }
    });

    this.audio.addEventListener('ended', () => {

      this.isPlaying = false;

      const playBtn =
        document.getElementById('playBtn');

      const icon =
        playBtn?.querySelector('.play-icon');

      playBtn?.classList.remove('playing');

      if (icon) {
        icon.textContent = '▶';
      }

      this.progressWidth = 0;
    });
  }

  ngAfterViewInit(): void {
    this.initParticles();
    this.initScrollReveal();
  }

  ngOnDestroy(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (this.musicInterval) clearInterval(this.musicInterval);
    if (this.observer)      this.observer.disconnect();
    if (this.animFrame)     cancelAnimationFrame(this.animFrame);
  }

  // ─── COUNTDOWN ───────────────────────────────
  startCountdown(): void {

    const update = () => {

      this.ngZone.run(() => {

        const now = Date.now();
        const distance = this.targetDate - now;

        if (distance < 0) {
          clearInterval(this.timerInterval);
          this.days = this.hours = this.minutes = this.seconds = '00';
          return;
        }

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        this.days = d < 10 ? '0' + d : String(d);
        this.hours = h < 10 ? '0' + h : String(h);
        this.minutes = m < 10 ? '0' + m : String(m);
        this.seconds = s < 10 ? '0' + s : String(s);

        this.cdr.detectChanges();
      });

    };

    update();
    this.timerInterval = setInterval(update, 1000);
  }

  // ─── PARTÍCULAS ──────────────────────────────
  initParticles(): void {
    this.canvas = document.getElementById('particlesCanvas') as HTMLCanvasElement;
    if (!this.canvas) return;

    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    // Roda fora da zona Angular para não acionar change detection
    this.ngZone.runOutsideAngular(() => {
      this.animateParticles();
    });
  }

  private resizeCanvas(): void {
    if (!this.canvas) return;
    this.canvas.width  = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
  }

  private spawnParticle(): Particle {
    const canvasWidth  = this.canvas?.width  ?? 400;
    const canvasHeight = this.canvas?.height ?? 600;

    return {
      x:          Math.random() * canvasWidth,
      y:          -10,
      size:       Math.random() * 2 + 0.5,
      speedY:     Math.random() * 0.6 + 0.2,
      speedX:     (Math.random() - 0.5) * 0.4,
      opacity:    Math.random() * 0.5 + 0.1,
      shape:      Math.random() > 0.6 ? 'diamond' : 'dot',
      drift:      Math.random() * Math.PI * 2,
      driftSpeed: Math.random() * 0.01 + 0.005,
    };
  }

  private drawParticle(p: Particle): void {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle   = '#ffffff';

    if (p.shape === 'diamond') {
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-p.size, -p.size, p.size * 2, p.size * 2);
    } else {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private animateParticles(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx    = this.ctx;
    const canvas = this.canvas;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Cria nova partícula com baixa probabilidade
    if (this.particles.length < 35 && Math.random() > 0.7) {
      this.particles.push(this.spawnParticle());
    }

    // Atualiza e filtra partículas mortas
    this.particles = this.particles.filter(p => {
      p.drift  += p.driftSpeed;
      p.x      += p.speedX + Math.sin(p.drift) * 0.3;
      p.y      += p.speedY;
      p.opacity -= 0.0008;
      this.drawParticle(p);
      return p.y < canvas.height + 10 && p.opacity > 0;
    });

    this.animFrame = requestAnimationFrame(() => this.animateParticles());
  }

  private burstParticles(): void {
    if (!this.canvas) return;
    const canvas = this.canvas;

    for (let i = 0; i < 30; i++) {
      setTimeout(() => {
        const p      = this.spawnParticle();
        p.x          = Math.random() * canvas.width;
        p.y          = canvas.height * 0.3 + Math.random() * canvas.height * 0.4;
        p.speedY     = (Math.random() - 0.5) * 1;
        p.opacity    = Math.random() * 0.8 + 0.2;
        p.size       = Math.random() * 3 + 1;
        this.particles.push(p);
      }, i * 30);
    }
  }

  // ─── VÉU — ANIMAÇÃO DE REVELAÇÃO ─────────────
  revealInvite(): void {
    document.getElementById('envelopeTop')?.classList.add('opened');
    document.getElementById('envelopeBottom')?.classList.add('opened');
    if (this.veilRevealed) return;
    this.toggleMusic();

    document.body.style.overflow = 'auto';
    this.veilRevealed = true;

    const veil      = document.getElementById('veilOverlay');
    const veilEdge  = document.getElementById('veilBottomEdge');
    const content   = document.getElementById('veilContent');
    const btn       = document.getElementById('veilBtn');
    const invitation = document.getElementById('invitationContent');

    // 1. Esconde o botão
    btn?.classList.add('hidden');

    // 2. Levanta o véu
    veil?.classList.add('lifted');
    veilEdge?.classList.add('lifted');

    // 3. Revela o conteúdo central
    content?.classList.add('visible');

    // 4. Burst de partículas douradas no momento da revelação
    // setTimeout(() => this.burstParticles(), 600);

    // 5. Revela o restante do convite e rola suavemente
    setTimeout(() => {
      if (invitation) {
        invitation.classList.add('visible');
      }
      this.refreshRevealObserver();
    }, 1000);

    setTimeout(() => {
      this.showScrollIndicator = true;
      this.cdr.detectChanges();
    }, 4000);
  }

  // ─── MÚSICA ──────────────────────────────────
  toggleMusic(): void {
    this.audio.volume = 0.4;
    const playBtn =
      document.getElementById('playBtn');

    const icon =
      playBtn?.querySelector('.play-icon');

    if (!this.isPlaying) {

      this.audio.play();

      this.isPlaying = true;

      playBtn?.classList.add('playing');

      if (icon) {
        icon.textContent = '⏸';
      }

    } else {

      this.audio.pause();

      this.isPlaying = false;

      playBtn?.classList.remove('playing');

      if (icon) {
        icon.textContent = '▶';
      }
    }
  }

  // ─── SCROLL REVEAL ───────────────────────────
  initScrollReveal(): void {
    const options: IntersectionObserverInit = {
      root:       null,
      rootMargin: '0px 0px -60px 0px',
      threshold:  0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    this.observeRevealElements();
  }

  private observeRevealElements(): void {
    document.querySelectorAll('.reveal').forEach(el => {
      this.observer?.observe(el);
    });
  }

  private refreshRevealObserver(): void {
    this.observeRevealElements();
  }

  // ─── AÇÕES DE BOTÕES ─────────────────────────
  openMap(local: 'cerimonia' | 'festa'): void {
    const urls: Record<string, string> = {
      cerimonia: 'https://www.google.com/maps/place/Portal+Gaia/@-18.8173701,-48.4398324,1067m/data=!3m2!1e3!4b1!4m6!3m5!1s0x94a415c3aebb8b09:0x20334df65f45f71a!8m2!3d-18.8173752!4d-48.4372575!16s%2Fg%2F11rmq3rcdl?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D',
      festa:     'https://www.google.com/maps/place/Portal+Gaia/@-18.8173701,-48.4398324,1067m/data=!3m2!1e3!4b1!4m6!3m5!1s0x94a415c3aebb8b09:0x20334df65f45f71a!8m2!3d-18.8173752!4d-48.4372575!16s%2Fg%2F11rmq3rcdl?entry=ttu&g_ep=EgoyMDI2MDYxMy4wIKXMDSoASAFQAw%3D%3D',
    };
    window.open(urls[local] ?? urls['cerimonia'], '_blank');
  }

  confirmarPresenca(): void {
    const numero   = '5534999999999'; // ← substituir pelo número real
    const mensagem = encodeURIComponent(
      'Olá! Confirmo minha presença no casamento de Johnny & Paula em 24/10/2026. 🎊'
    );
    window.open(`https://wa.me/${numero}?text=${mensagem}`, '_blank');
  }

  acessarLista(): void {
    window.open('https://linkdalista.com.br', '_blank'); // ← substituir pela URL real
  }
}
