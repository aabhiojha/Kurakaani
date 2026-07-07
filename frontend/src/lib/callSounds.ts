/**
 * Call sounds synthesized with the Web Audio API — no audio assets needed.
 * - ringback: what the caller hears while waiting (soft dual-tone, 2s on / 4s off)
 * - ringtone: what the callee hears on an incoming call (melodic double-chirp)
 */

type SoundKind = 'ringback' | 'ringtone'

class CallSoundPlayer {
	private ctx: AudioContext | null = null
	private intervalId: number | null = null
	private activeNodes: OscillatorNode[] = []
	private current: SoundKind | null = null

	private getContext(): AudioContext | null {
		try {
			if (!this.ctx) this.ctx = new AudioContext()
			if (this.ctx.state === 'suspended') void this.ctx.resume()
			return this.ctx
		} catch {
			return null
		}
	}

	/** Schedule a tone burst of the given frequencies at an offset from now. */
	private burst(ctx: AudioContext, frequencies: number[], startOffset: number, duration: number, volume: number) {
		const start = ctx.currentTime + startOffset
		const end = start + duration
		for (const frequency of frequencies) {
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.type = 'sine'
			osc.frequency.value = frequency
			// Short attack/release ramps to avoid clicks
			gain.gain.setValueAtTime(0, start)
			gain.gain.linearRampToValueAtTime(volume, start + 0.02)
			gain.gain.setValueAtTime(volume, end - 0.04)
			gain.gain.linearRampToValueAtTime(0, end)
			osc.connect(gain)
			gain.connect(ctx.destination)
			osc.start(start)
			osc.stop(end)
			this.activeNodes.push(osc)
			osc.onended = () => {
				this.activeNodes = this.activeNodes.filter((n) => n !== osc)
			}
		}
	}

	private playCycle(kind: SoundKind, ctx: AudioContext) {
		if (kind === 'ringback') {
			// Classic ringback: 440+480 Hz, 2s on / 4s off
			this.burst(ctx, [440, 480], 0, 2, 0.08)
		} else {
			// Incoming ringtone: two double-chirps per cycle
			this.burst(ctx, [880, 1108.73], 0, 0.35, 0.12)
			this.burst(ctx, [880, 1108.73], 0.5, 0.35, 0.12)
		}
	}

	private play(kind: SoundKind, cycleMs: number) {
		if (this.current === kind) return
		this.stop()
		const ctx = this.getContext()
		if (!ctx) return
		this.current = kind
		this.playCycle(kind, ctx)
		this.intervalId = window.setInterval(() => this.playCycle(kind, ctx), cycleMs)
	}

	/** Caller side: waiting for the other person to pick up. */
	playRingback() {
		this.play('ringback', 6000)
	}

	/** Callee side: incoming call alert. */
	playRingtone() {
		this.play('ringtone', 2500)
	}

	stop() {
		if (this.intervalId !== null) {
			window.clearInterval(this.intervalId)
			this.intervalId = null
		}
		for (const osc of this.activeNodes) {
			try {
				osc.stop()
			} catch {
				// already stopped
			}
		}
		this.activeNodes = []
		this.current = null
	}
}

export const callSounds = new CallSoundPlayer()
