import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef } from 'react';

export function useFeedbackEffects(settings, soundFiles) {
  const soundsRef = useRef({});
  const overlapRefs = useRef({});
  const loadingRef = useRef({ main: {}, overlap: {} });
  const audioModeRef = useRef({ ready: false, promise: null });

  useEffect(() => {
    audioModeRef.current.promise = Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    })
      .then(() => {
        audioModeRef.current.ready = true;
      })
      .catch(() => {});
  }, []);

  const ensureAudioMode = useCallback(async () => {
    const promise = audioModeRef.current.promise;
    if (!promise) return;
    try {
      await promise;
    } catch {}
  }, []);

  const ensureLoaded = useCallback(async (kind, key) => {
    const bucket = kind === 'overlap' ? overlapRefs : soundsRef;
    const loadingBucket = kind === 'overlap' ? loadingRef.current.overlap : loadingRef.current.main;

    if (bucket.current[key]) return bucket.current[key];
    if (!soundFiles[key]) return null;

    if (!loadingBucket[key]) {
      loadingBucket[key] = (async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(soundFiles[key], { shouldPlay: false, volume: 1 });
          bucket.current[key] = sound;
          return sound;
        } catch {
          return null;
        } finally {
          delete loadingBucket[key];
        }
      })();
    }

    return loadingBucket[key];
  }, [soundFiles]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      for (const key of Object.keys(soundFiles)) {
        if (!mounted) return;
        await ensureLoaded('main', key);
      }
      if (mounted) await ensureLoaded('overlap', 'complete');
    })();

    return () => {
      mounted = false;
      const sounds = [...Object.values(soundsRef.current), ...Object.values(overlapRefs.current)];
      soundsRef.current = {};
      overlapRefs.current = {};
      Promise.all(sounds.map((sound) => sound?.unloadAsync?.().catch(() => {}))).catch(() => {});
    };
  }, [ensureLoaded, soundFiles]);

  const playSound = useCallback(async (key, kind = 'main') => {
    if (!settings?.soundsEnabled) return;
    await ensureAudioMode();

    let sound = kind === 'overlap' ? overlapRefs.current[key] : soundsRef.current[key];
    if (!sound) sound = await ensureLoaded(kind, key);
    if (!sound) return;

    const volume = typeof settings?.soundsVolume === 'number' ? settings.soundsVolume : 1;
    try {
      await sound.setVolumeAsync(volume);
      await sound.replayAsync();
    } catch {
      try {
        await sound.stopAsync();
        await sound.playAsync();
      } catch {}
    }
  }, [ensureAudioMode, ensureLoaded, settings?.soundsEnabled, settings?.soundsVolume]);

  const haptic = useCallback(async (kind) => {
    if (!settings?.hapticsEnabled) return;
    try {
      if (kind === 'error') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else {
        await Haptics.selectionAsync();
      }
    } catch {}
  }, [settings?.hapticsEnabled]);

  const onEvent = useCallback((event) => {
    const type = String(event?.type || '');
    if (type === 'check') return playSound('check');
    if (type === 'castle') return Promise.all([playSound('castle'), haptic('move')]);
    if (type === 'capture') return Promise.all([playSound('capture'), haptic('move')]);
    if (type === 'complete') return playSound('complete', 'overlap');
    if (type === 'incorrect') return Promise.all([playSound('error'), haptic('error')]);
    if (type === 'move') return Promise.all([playSound('move'), haptic('move')]);
    return undefined;
  }, [haptic, playSound]);

  return useMemo(() => ({ onEvent }), [onEvent]);
}
