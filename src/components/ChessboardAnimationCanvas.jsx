import React, { useEffect, useRef, useState } from 'react';

export default function ChessboardAnimationCanvas({ fire, ice, lightning, smoke, water, wind, sleep }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId;
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;

    // Handle resize
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle arrays
    let fireParticles = [];
    let smokeParticles = [];
    let iceSparkles = [];
    let lightningBolts = [];
    let lightningFlash = 0; // opacity of white flash
    let waterParticles = [];
    let windParticles = [];
    let sleepParticles = [];

    // Helper classes
    class FireParticle {
      constructor() {
        this.reset();
        this.y = height + Math.random() * 50;
      }
      reset() {
        this.x = Math.random() * width;
        this.y = height + 10;
        this.vx = Math.random() * 4 - 2;
        this.vy = -Math.random() * 6 - 4;
        this.size = Math.random() * 15 + 8;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.015;
        this.hue = Math.random() * 35 + 10; // Red/Orange/Yellow spectrum
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.size = Math.max(0.1, this.size - 0.2);
        if (this.alpha <= 0) this.reset();
      }
      draw(context) {
        context.save();
        context.globalCompositeOperation = 'screen';
        const grad = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `rgba(255, 230, 100, ${this.alpha})`);
        grad.addColorStop(0.3, `hsla(${this.hue}, 100%, 50%, ${this.alpha * 0.8})`);
        grad.addColorStop(1, `rgba(239, 68, 68, 0)`);
        context.fillStyle = grad;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    class SmokeParticle {
      constructor(isPersistent = false) {
        this.isPersistent = isPersistent;
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = Math.random() * 0.6 - 0.3;
        this.vy = -Math.random() * 0.4 - 0.1;
        this.size = Math.random() * 60 + 50;
        this.alpha = isPersistent ? Math.random() * 0.4 + 0.2 : 0;
        this.maxAlpha = Math.random() * 0.4 + 0.3;
        this.growth = Math.random() * 0.05 + 0.02;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (!this.isPersistent) {
          if (this.alpha < this.maxAlpha) {
            this.alpha += 0.02;
          }
        }
        if (this.y < -this.size) {
          this.y = height + this.size;
          this.x = Math.random() * width;
        }
      }
      draw(context) {
        context.save();
        const grad = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        grad.addColorStop(0, `rgba(75, 85, 99, ${this.alpha * 0.6})`);
        grad.addColorStop(0.5, `rgba(55, 65, 81, ${this.alpha * 0.35})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        context.fillStyle = grad;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    class IceSparkle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 6 + 2;
        this.alpha = Math.random() * 0.5 + 0.3;
        this.speed = Math.random() * 0.02 + 0.01;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = Math.random() * 0.05 - 0.025;
      }
      update() {
        this.alpha += this.speed;
        this.angle += this.spin;
        if (this.alpha > 0.95 || this.alpha < 0.25) {
          this.speed = -this.speed;
        }
      }
      draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.angle);
        context.shadowBlur = 10;
        context.shadowColor = '#93c5fd';
        context.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        
        context.beginPath();
        context.moveTo(0, -this.size);
        context.lineTo(this.size * 0.2, -this.size * 0.2);
        context.lineTo(this.size, 0);
        context.lineTo(this.size * 0.2, this.size * 0.2);
        context.lineTo(0, this.size);
        context.lineTo(-this.size * 0.2, this.size * 0.2);
        context.lineTo(-this.size, 0);
        context.lineTo(-this.size * 0.2, -this.size * 0.2);
        context.closePath();
        context.fill();
        context.restore();
      }
    }

    class WaterParticle {
      constructor() {
        this.reset();
        this.y = height + Math.random() * 50;
      }
      reset() {
        this.x = Math.random() * width;
        this.y = height + 10;
        this.vx = Math.random() * 3 - 1.5;
        this.vy = -Math.random() * 5 - 3;
        this.size = Math.random() * 8 + 4;
        this.alpha = 1;
        this.decay = Math.random() * 0.04 + 0.02;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.alpha <= 0) this.reset();
      }
      draw(context) {
        context.save();
        context.globalCompositeOperation = 'source-over';
        context.fillStyle = `rgba(59, 130, 246, ${this.alpha * 0.8})`;
        context.strokeStyle = `rgba(191, 219, 254, ${this.alpha * 0.9})`;
        context.lineWidth = 1.5;
        context.beginPath();
        context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        context.restore();
      }
    }

    class WindParticle {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = -Math.random() * 100;
        this.y = Math.random() * height;
        this.vx = Math.random() * 12 + 8;
        this.vy = Math.random() * 2 - 1;
        this.length = Math.random() * 80 + 40;
        this.alpha = Math.random() * 0.3 + 0.15;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        if (this.x > width) this.reset();
      }
      draw(context) {
        context.save();
        context.strokeStyle = `rgba(241, 245, 249, ${this.alpha})`;
        context.lineWidth = Math.random() * 2 + 0.5;
        context.beginPath();
        context.moveTo(this.x, this.y);
        context.lineTo(this.x + this.length, this.y + this.vy * 2);
        context.stroke();
        context.restore();
      }
    }

    class SleepParticle {
      constructor() {
        this.reset();
        this.y = Math.random() * height;
      }
      reset() {
        this.x = Math.random() * width;
        this.y = height + 20;
        this.vx = Math.random() * 1.5 - 0.75;
        this.vy = -Math.random() * 1.5 - 0.75;
        this.size = Math.random() * 12 + 10;
        this.alpha = 1;
        this.decay = Math.random() * 0.015 + 0.008;
        this.angle = Math.random() * 0.4 - 0.2;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        this.angle += 0.01;
        if (this.alpha <= 0) this.reset();
      }
      draw(context) {
        context.save();
        context.translate(this.x, this.y);
        context.rotate(this.angle);
        context.fillStyle = `rgba(168, 85, 247, ${this.alpha})`;
        context.font = `bold ${this.size}px Outfit, sans-serif`;
        context.fillText('Zzz', 0, 0);
        context.restore();
      }
    }

    // Initialize fire particles
    for (let i = 0; i < 40; i++) {
      fireParticles.push(new FireParticle());
    }

    // Initialize smoke particles
    for (let i = 0; i < 25; i++) {
      smokeParticles.push(new SmokeParticle(true));
    }

    // Initialize ice sparkles
    for (let i = 0; i < 20; i++) {
      iceSparkles.push(new IceSparkle());
    }

    // Initialize water particles
    for (let i = 0; i < 30; i++) {
      waterParticles.push(new WaterParticle());
    }

    // Initialize wind particles
    for (let i = 0; i < 15; i++) {
      windParticles.push(new WindParticle());
    }

    // Initialize sleep particles
    for (let i = 0; i < 12; i++) {
      sleepParticles.push(new SleepParticle());
    }

    // Generate random lightning bolts
    const createLightningBolt = () => {
      const startX = Math.random() * width;
      const boltSegments = [];
      let currentX = startX;
      let currentY = 0;
      
      while (currentY < height) {
        const nextX = currentX + (Math.random() * 40 - 20);
        const nextY = currentY + (Math.random() * 25 + 10);
        boltSegments.push({ x1: currentX, y1: currentY, x2: nextX, y2: nextY });
        currentX = nextX;
        currentY = nextY;
      }
      return { segments: boltSegments, alpha: 1, decay: 0.06 };
    };

    // Main animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // ─── FIRE EFFECT ───
      if (fire) {
        fireParticles.forEach(p => {
          p.update();
          p.draw(ctx);
        });
      }

      // ─── SMOKESCREEN EFFECT ───
      if (smoke) {
        smokeParticles.forEach(p => {
          p.update();
          p.draw(ctx);
        });
      }

      // ─── ICE FREEZE EFFECT ───
      if (ice) {
        ctx.save();
        ctx.strokeStyle = 'rgba(147, 197, 253, 0.45)';
        ctx.lineWidth = 6;
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#60a5fa';
        
        ctx.beginPath();
        const borderInset = 8;
        ctx.moveTo(borderInset, borderInset);
        for (let x = borderInset; x < width - borderInset; x += 15) {
          ctx.lineTo(x, borderInset + (Math.random() * 8 - 4));
        }
        ctx.lineTo(width - borderInset, height - borderInset);
        for (let y = borderInset; y < height - borderInset; y += 15) {
          ctx.lineTo(width - borderInset + (Math.random() * 8 - 4), y);
        }
        ctx.lineTo(width - borderInset, height - borderInset);
        for (let x = width - borderInset; x > borderInset; x -= 15) {
          ctx.lineTo(x, height - borderInset + (Math.random() * 8 - 4));
        }
        ctx.lineTo(borderInset, borderInset);
        for (let y = height - borderInset; y > borderInset; y -= 15) {
          ctx.lineTo(borderInset + (Math.random() * 8 - 4), y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        iceSparkles.forEach(s => {
          s.update();
          s.draw(ctx);
        });
      }

      // ─── WATER BLAST EFFECT ───
      if (water) {
        waterParticles.forEach(p => {
          p.update();
          p.draw(ctx);
        });
      }

      // ─── WIND ATTACK EFFECT ───
      if (wind) {
        windParticles.forEach(p => {
          p.update();
          p.draw(ctx);
        });
      }

      // ─── SLEEP POWDER EFFECT ───
      if (sleep) {
        sleepParticles.forEach(p => {
          p.update();
          p.draw(ctx);
        });
      }

      // ─── LIGHTNING EFFECT ───
      if (lightning) {
        if (Math.random() < 0.05 && lightningBolts.length < 2) {
          lightningBolts.push(createLightningBolt());
          lightningFlash = 0.8;
        }

        lightningBolts.forEach((b, index) => {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha})`;
          ctx.lineWidth = Math.random() * 3 + 1;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#60a5fa';
          ctx.beginPath();

          b.segments.forEach(seg => {
            ctx.moveTo(seg.x1, seg.y1);
            ctx.lineTo(seg.x2, seg.y2);
          });
          ctx.stroke();
          ctx.restore();

          b.alpha -= b.decay;
          if (b.alpha <= 0) {
            lightningBolts.splice(index, 1);
          }
        });

        if (lightningFlash > 0) {
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${lightningFlash})`;
          ctx.fillRect(0, 0, width, height);
          ctx.restore();
          lightningFlash -= 0.08;
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [fire, ice, lightning, smoke, water, wind, sleep]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 99,
        pointerEvents: 'none',
        borderRadius: '8px'
      }}
    />
  );
}
