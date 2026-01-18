
import React, { useEffect, useState, useRef } from 'react';
import { useFocusable, FocusContext } from '@noriginmedia/norigin-spatial-navigation';
import { FocusableItem } from '../../components/FocusableItem';
import './login.css';
import { type LoginData } from '../../types/shared.types';
import { getAllProfiles, saveProfile, deleteProfile } from '../../services/profileService';
import { apiService } from '../../services/apiService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Props = {
    onSubmit: (data: LoginData) => void;
};


function Login(props: Props) {
    const { ref, focusKey, focusSelf } = useFocusable();
    const queryClient = useQueryClient();

    useEffect(() => {
        focusSelf();
    }, [focusSelf]);

    // Handle Tizen Exit on Back Button
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.keyCode === 10009 || e.key === 'Backspace' || e.key === 'Escape') {
                if (window.confirm('Are you sure you want to exit React IP Tv?')) {
                    try {
                        // @ts-ignore
                        if (typeof tizen !== 'undefined') {
                            // @ts-ignore
                            tizen.application.getCurrentApplication().exit();
                        } else {
                            window.close();
                        }
                    } catch (err) {
                        console.error('Exit failed', err);
                        window.close();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const [form, setForm] = useState<LoginData>({
        profileName: '',
        userName: '',
        password: '',
        url: ''
    });

    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [profiles, setProfiles] = useState<LoginData[]>(getAllProfiles());
    const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

    // Refs for input fields to trigger TV keyboard
    const profileNameRef = useRef<HTMLInputElement>(null);
    const userNameRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const urlRef = useRef<HTMLInputElement>(null);

    // Helper to blur any active input before focusing a new one
    function focusInput(inputRef: React.RefObject<HTMLElement | null>): void {
        // Blur any currently focused element first
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        // Focus the new input/select to trigger TV interaction
        inputRef.current?.focus();
    }

    function handleUpdate(key: keyof LoginData, value: string): void {
        setForm(prevForm => ({
            ...prevForm,
            [key]: value
        }));
        // Clear messages when user starts typing
        if (error) setError('');
        if (success) setSuccess('');
    }

    function handleProfileSelect(profileName: string): void {
        setIsDropdownOpen(false); // Close after selection

        if (profileName === 'NEW') {
            setForm({
                profileName: '',
                userName: '',
                password: '',
                url: ''
            });
        } else {
            const profile = profiles.find(p => p.profileName === profileName);
            if (profile) {
                setForm(profile);
                setError('');
                setSuccess('');
            }
        }
    }

    function validateForm(): boolean {
        const emptyFields: string[] = [];
        if (!form.profileName.trim()) emptyFields.push('Profile Name');
        if (!form.userName.trim()) emptyFields.push('User Name');
        if (!form.password.trim()) emptyFields.push('Password');
        if (!form.url.trim()) emptyFields.push('URL');

        if (emptyFields.length > 0) {
            setError(`Please fill in: ${emptyFields.join(', ')}`);
            return false;
        }
        setError('');
        return true;
    }

    function handleSaveProfile(): void {
        if (validateForm()) {
            saveProfile(form);
            setProfiles(getAllProfiles()); // Refresh dropdown
            setSuccess(`Profile "${form.profileName}" saved!`);
            console.log('Profile saved:', form.profileName);
        }
    }

    function handleDeleteProfile(): void {
        const nameToDelete = form.profileName;
        if (!nameToDelete) return;

        // Check if it exists
        const exists = profiles.some(p => p.profileName === nameToDelete);
        if (!exists) {
            setError("Cannot delete unsaved profile.");
            return;
        }

        deleteProfile(nameToDelete);
        setProfiles(getAllProfiles()); // Refresh dropdown

        // Reset form
        setForm({
            profileName: '',
            userName: '',
            password: '',
            url: ''
        });

        setSuccess(`Profile "${nameToDelete}" deleted!`);
    }

    const loginMutation = useMutation({
        mutationFn: (data: LoginData) => apiService.login(data.userName, data.password, data.url),
        onSuccess: async (data, variables) => {
            console.log('Login successful:', data);
            setSuccess(`Welcome, ${data.user_info.username}!`);

            // Save profile
            saveProfile(variables);
            setProfiles(getAllProfiles());

            // Prefetch Categories
            setSuccess('Loading content...');
            try {
                await Promise.all([
                    queryClient.prefetchQuery({
                        queryKey: ['vodCategories'],
                        queryFn: () => apiService.getVodCategories(variables.userName, variables.password, variables.url)
                    }),
                    queryClient.prefetchQuery({
                        queryKey: ['seriesCategories'],
                        queryFn: () => apiService.getSeriesCategories(variables.userName, variables.password, variables.url)
                    })
                ]);
            } catch (e) {
                console.error('Prefetch failed', e);
                // Continue anyway, we can fetch later
            }

            props.onSubmit(variables);
        },
        onError: (err: any) => {
            setError(err.message || 'Login failed');
        }
    });

    function handleLogin(): void {
        if (validateForm()) {
            setError('');
            loginMutation.mutate(form);
        }
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>): void {
        event.preventDefault();
        handleLogin();
    }

    return (
        <FocusContext.Provider value={focusKey}>
            <div className="login-container">
                <div className="login-left-pane">
                    <h1 className="login-app-name">React IP Tv</h1>
                    <img src="/icon.png" alt="React IP Tv Icon" className="login-app-icon" />
                </div>

                <div className="login-right-pane">
                    <div className="profile-selector">
                        {/* Main Dropdown Button */}
                        <FocusableItem onEnterPress={() => setIsDropdownOpen(!isDropdownOpen)}>
                            {(focused) => (
                                <div className={`custom-select-trigger ${focused ? 'focused' : ''}`}>
                                    <span>
                                        {profiles.find(p => p.profileName === form.profileName)?.profileName || '+ Add New Profile'}
                                    </span>
                                    <span className="arrow">{isDropdownOpen ? '▲' : '▼'}</span>
                                </div>
                            )}
                        </FocusableItem>

                        {/* Dropdown Options List */}
                        {isDropdownOpen && (
                            <div className="custom-options-list">
                                <FocusableItem onEnterPress={() => handleProfileSelect('NEW')}>
                                    {(focused) => (
                                        <div className={`custom-option ${focused ? 'focused' : ''} ${form.profileName === '' ? 'selected' : ''}`}>
                                            + Add New Profile
                                        </div>
                                    )}
                                </FocusableItem>

                                {profiles.map(p => (
                                    <FocusableItem key={p.profileName} onEnterPress={() => handleProfileSelect(p.profileName)}>
                                        {(focused) => (
                                            <div className={`custom-option ${focused ? 'focused' : ''} ${form.profileName === p.profileName ? 'selected' : ''}`}>
                                                {p.profileName}
                                            </div>
                                        )}
                                    </FocusableItem>
                                ))}
                            </div>
                        )}
                    </div>

                    <form ref={ref} onSubmit={handleSubmit}>
                        <div>
                            <label>Profile Name:</label>
                            <FocusableItem onEnterPress={() => focusInput(profileNameRef)}>
                                {(focused) => (
                                    <input
                                        ref={profileNameRef}
                                        type="text"
                                        value={form.profileName}
                                        className={focused ? 'focusable focused' : 'focusable'}
                                        onChange={e => handleUpdate('profileName', e.target.value)}
                                    />
                                )}
                            </FocusableItem>
                        </div>
                        <div>
                            <label>User Name:</label>
                            <FocusableItem onEnterPress={() => focusInput(userNameRef)}>
                                {(focused) => (
                                    <input
                                        ref={userNameRef}
                                        type="text"
                                        value={form.userName}
                                        className={focused ? 'focusable focused' : 'focusable'}
                                        onChange={e => handleUpdate('userName', e.target.value)}
                                    />
                                )}
                            </FocusableItem>
                        </div>
                        <div>
                            <label>Password:</label>
                            <FocusableItem onEnterPress={() => focusInput(passwordRef)}>
                                {(focused) => (
                                    <input
                                        ref={passwordRef}
                                        type="text"
                                        value={form.password}
                                        className={focused ? 'focusable focused' : 'focusable'}
                                        onChange={e => handleUpdate('password', e.target.value)}
                                    />
                                )}
                            </FocusableItem>
                        </div>
                        <div>
                            <label>URL:</label>
                            <FocusableItem onEnterPress={() => focusInput(urlRef)}>
                                {(focused) => (
                                    <input
                                        ref={urlRef}
                                        type="text"
                                        value={form.url}
                                        className={focused ? 'focusable focused' : 'focusable'}
                                        onChange={e => handleUpdate('url', e.target.value)}
                                    />
                                )}
                            </FocusableItem>
                        </div>

                        <div className="button-group">
                            <FocusableItem onEnterPress={handleSaveProfile}>
                                {(focused) => (
                                    <button
                                        type="button"
                                        className={`btn-secondary ${focused ? 'focused' : ''}`}
                                    >
                                        Save Profile
                                    </button>
                                )}
                            </FocusableItem>
                            <FocusableItem onEnterPress={handleDeleteProfile}>
                                {(focused) => (
                                    <button
                                        type="button"
                                        className={`btn-danger ${focused ? 'focused' : ''}`}
                                    >
                                        Delete Profile
                                    </button>
                                )}
                            </FocusableItem>
                        </div>

                        {error && <div className="error-message">{error}</div>}
                        {success && <div className="success-message">{success}</div>}

                        <FocusableItem onEnterPress={handleLogin} onFocus={() => setError('')}>
                            {(focused) => (
                                <button
                                    type="submit"
                                    className={focused ? 'focusable focused' : 'focusable'}
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? 'Connecting...' : 'Login'}
                                </button>
                            )}
                        </FocusableItem>
                    </form>
                </div>
            </div>
        </FocusContext.Provider>
    );
}
export default Login