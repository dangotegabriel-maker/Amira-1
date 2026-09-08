import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS } from '../theme/COLORS';
import { callService } from '../services/callService';
import { dbService } from '../services/firebaseService';

const IncomingCallCard = ({ call, navigation, onDismiss }) => {
  const [caller, setCaller] = useState(null);
  const [responding, setResponding] = useState(false);

  const callId = call?.callId || call?.id;

  useEffect(() => {
    if (!call?.callerId) return;

    dbService
      .getUserProfile(call.callerId)
      .then(setCaller)
      .catch(() => {});
  }, [call?.callerId]);

  useEffect(() => {
    const expiresAtMs = Number(call?.expiresAtMs || 0);

    if (!expiresAtMs) return undefined;

    const remainingMs = expiresAtMs - Date.now();

    if (remainingMs <= 0) {
      onDismiss?.();
      return undefined;
    }

    const timer = setTimeout(() => {
      onDismiss?.();
    }, remainingMs + 250);

    return () => clearTimeout(timer);
  }, [callId, call?.expiresAtMs, onDismiss]);

  const handleExpiredCall = (error) => {
    const message = String(error?.message || '');

    if (
      message.includes('can no longer be answered') ||
      message.includes('not-ringable') ||
      message.includes('expired')
    ) {
      onDismiss?.();
      return true;
    }

    return false;
  };

  const decline = async () => {
    if (responding || !callId) return;

    setResponding(true);

    try {
      await callService.respond({
        callId,
        action: 'decline',
      });

      onDismiss?.();
    } catch (error) {
      if (!handleExpiredCall(error)) {
        Alert.alert(
          'Could not decline call',
          error?.message || 'Please try again.',
        );
      }
    } finally {
      setResponding(false);
    }
  };

  const accept = async () => {
    if (responding || !callId) return;

    setResponding(true);

    try {
      const accepted = await callService.respond({
        callId,
        action: 'accept',
      });

      onDismiss?.();

      navigation.navigate('VideoCall', {
        call: {
          ...call,
          ...accepted,
        },
        creator: caller,
      });
    } catch (error) {
      if (!handleExpiredCall(error)) {
        Alert.alert(
          'Could not answer call',
          error?.message || 'Please try again.',
        );
      }
    } finally {
      setResponding(false);
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {caller?.profilePic ? (
          <Image
            source={{ uri: caller.profilePic }}
            style={styles.avatar}
          />
        ) : null}

        <Text style={styles.label}>Incoming video call</Text>

        <Text style={styles.name}>
          {caller?.username || 'Amira member'}
        </Text>

        {caller?.countryName ? (
          <Text style={styles.country}>
            {caller.countryName}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.decline,
              responding && styles.disabled,
            ]}
            onPress={decline}
            disabled={responding}
          >
            <Text style={styles.white}>Decline</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.accept,
              responding && styles.disabled,
            ]}
            onPress={accept}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.white}>Accept</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '88%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: 14,
  },
  label: {
    color: COLORS.primary,
    fontWeight: '900',
  },
  name: {
    fontSize: 25,
    fontWeight: '900',
    color: COLORS.text,
    marginTop: 5,
  },
  country: {
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 22,
  },
  decline: {
    backgroundColor: '#DC2626',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 28,
    minWidth: 110,
    alignItems: 'center',
  },
  accept: {
    backgroundColor: '#16A34A',
    borderRadius: 22,
    paddingVertical: 13,
    paddingHorizontal: 30,
    minWidth: 110,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  white: {
    color: 'white',
    fontWeight: '900',
  },
});

export default IncomingCallCard;