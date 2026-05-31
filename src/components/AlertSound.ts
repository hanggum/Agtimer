class AlertSound {
  private getContext(): AudioContext | null {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return null;
      return new AudioCtx();
    } catch {
      return null;
    }
  }

  public play() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      
      // Play a premium warm melodic arpeggio (C5 -> E5 -> G5 -> C6)
      const notes = [
        { freq: 523.25, delay: 0.0, duration: 0.6, type: 'triangle' as OscillatorType },   // C5
        { freq: 659.25, delay: 0.08, duration: 0.6, type: 'triangle' as OscillatorType },  // E5
        { freq: 783.99, delay: 0.16, duration: 0.6, type: 'triangle' as OscillatorType },  // G5
        { freq: 1046.50, delay: 0.24, duration: 0.8, type: 'sine' as OscillatorType }      // C6
      ];

      notes.forEach((note) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = note.type;
        osc.frequency.setValueAtTime(note.freq, now + note.delay);
        
        // Attack, decay, sustain, release envelope for a soft premium bell chime
        gainNode.gain.setValueAtTime(0, now + note.delay);
        gainNode.gain.linearRampToValueAtTime(0.12, now + note.delay + 0.04);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.delay + note.duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + note.delay);
        osc.stop(now + note.delay + note.duration);
      });
      
      // Auto-close AudioContext to free resources after the chime finishes
      setTimeout(() => {
        ctx.close();
      }, 1200);

    } catch (error) {
      console.warn("Failed to play audio chime:", error);
    }
  }
}

export const alertSound = new AlertSound();
export default alertSound;
