import { Linking, Platform } from 'react-native';

type MapTarget = {
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export function hasMapTarget({ location, latitude, longitude }: MapTarget) {
  return (
    (latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined) ||
    !!location?.trim()
  );
}

export function getMapUrl({ location, latitude, longitude }: MapTarget) {
  const label = location?.trim() ?? '';
  const hasCoordinates =
    latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  if (hasCoordinates) {
    const point = `${latitude},${longitude}`;
    if (Platform.OS === 'ios') {
      return `http://maps.apple.com/?ll=${point}&q=${encodeURIComponent(label || 'Venue')}`;
    }
    if (Platform.OS === 'android') {
      return `geo:${point}?q=${point}(${encodeURIComponent(label || 'Venue')})`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${point}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

export function openInMaps(target: MapTarget) {
  return Linking.openURL(getMapUrl(target));
}
