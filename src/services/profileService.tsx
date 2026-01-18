import { type LoginData } from '../types/shared.types';

const PROFILES_KEY = 'tv-app-profiles';

function saveProfile(inputProfile: LoginData): void {
    const profiles = getAllProfiles();
    // Check if profile already exists, update it; otherwise add new
    const existingIndex = profiles.findIndex(p => p.profileName === inputProfile.profileName);
    if (existingIndex >= 0) {
        profiles[existingIndex] = inputProfile;
    } else {
        profiles.push(inputProfile);
    }
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

function getAllProfiles(): LoginData[] {
    const profiles = localStorage.getItem(PROFILES_KEY);
    return profiles ? JSON.parse(profiles) : [];
}

function getProfile(profileName: string): LoginData | undefined {
    const profiles = getAllProfiles();
    return profiles.find(p => p.profileName === profileName);
}

function deleteProfile(profileName: string): void {
    const profiles = getAllProfiles();
    const filtered = profiles.filter(p => p.profileName !== profileName);
    localStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
}

export { saveProfile, getAllProfiles, getProfile, deleteProfile };
