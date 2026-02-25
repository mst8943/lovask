import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Lovask Mobile Onboarding Screen
 * Optimized for content-based responsiveness and mobile-first logic.
 */

// --- TYPES ---
type Gender = 'Erkek' | 'Kadın' | 'Non-binary';

export default function OnboardingScreen() {
    const { width, height } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [gender, setGender] = useState<Gender>();

    // --- RESPONSIVE LOGIC ---

    // 1. Breakpoint: Tablet (768px+)
    const isTablet = width >= 768;
    const isSmallDevice = width < 360; // iPhone SE, small Androids

    // 2. Fluid Layout Calculations
    // Max width for tablets to keep it "desktop-like" centered
    const containerWidth = isTablet ? 520 : '100%';

    // Fluid font size helper (based on standard 375px width)
    const fluidSize = (size: number) => {
        const scale = width / 375;
        const newSize = size * scale;
        // Bounds to prevent too small or too large
        return Math.min(Math.max(newSize, size * 0.9), size * (isTablet ? 1.1 : 1.2));
    };

    // Dynamic spacing
    const paddingBase = isSmallDevice ? 16 : 24;
    const headerMargin = isSmallDevice ? 24 : 40;

    return (
        <SafeAreaView style={styles.root}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingHorizontal: paddingBase }
                    ]}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    {/* Centered Container for Tablet/Large Screen Optimization */}
                    <View style={[styles.mainContainer, { maxWidth: containerWidth as any }]}>

                        {/* 1. Logo Section (Lovask) */}
                        <View style={[styles.header, { marginBottom: headerMargin }]}>
                            <View style={styles.logoRect}>
                                <View style={styles.logoInner} />
                            </View>
                            <Text style={styles.appName}>Lovask</Text>
                        </View>

                        {/* 2. Headline & Subtext */}
                        <View style={styles.textGroup}>
                            <Text
                                style={[
                                    styles.title,
                                    { fontSize: fluidSize(32), lineHeight: fluidSize(38) }
                                ]}
                            >
                                Kendini Tanıt.
                            </Text>
                            <Text
                                style={[
                                    styles.description,
                                    { fontSize: fluidSize(16), lineHeight: fluidSize(24) }
                                ]}
                            >
                                Ruh eşini bulman için seni biraz tanımamız gerekiyor. Adınla başlayalım.
                            </Text>
                        </View>

                        {/* 3. Form Fields */}
                        <View style={styles.form}>
                            {/* Name Input */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>Ad Soyad</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="İsmini buraya yaz..."
                                    placeholderTextColor="#52525b"
                                    selectionColor="#d946ef"
                                />
                            </View>

                            {/* City Selection (Dropdown Placeholder) */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>Şehir</Text>
                                <TouchableOpacity activeOpacity={0.7} style={styles.input}>
                                    <Text style={styles.inputTextPlaceholder}>Şehir seçiniz...</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Gender Chips (Flex Wrap Supported) */}
                            <View style={styles.inputWrapper}>
                                <Text style={styles.label}>Cinsiyet</Text>
                                <View style={styles.chipContainer}>
                                    {(['Erkek', 'Kadın', 'Non-binary'] as Gender[]).map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            onPress={() => setGender(item)}
                                            activeOpacity={0.7}
                                            style={[
                                                styles.chip,
                                                gender === item && styles.activeChip
                                            ]}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                gender === item && styles.activeChipText
                                            ]}>
                                                {item}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </View>

                        {/* 4. Action Button (Sticky-like flow) */}
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.button} activeOpacity={0.8}>
                                <Text style={styles.buttonText}>Devam Et</Text>
                            </TouchableOpacity>

                            {/* Bottom spacing for home bar safety if not handled by SafeAreaView */}
                            <View style={{ height: Math.max(insets.bottom, 16) }} />
                        </View>

                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// --- STYLES ---
const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#09090b', // Deep dark theme
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center', // Essential for tablet centering
        paddingTop: 40,
    },
    mainContainer: {
        width: '100%',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logoRect: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#d946ef', // Main Purple/Pink
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#d946ef',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    logoInner: {
        width: 18,
        height: 18,
        backgroundColor: '#fff',
        borderRadius: 4,
        transform: [{ rotate: '45deg' }],
    },
    appName: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    textGroup: {
        marginBottom: 32,
    },
    title: {
        color: '#fff',
        fontWeight: '800',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    description: {
        color: '#a1a1aa', // Zinc 400
        fontWeight: '500',
    },
    form: {
        gap: 20,
        marginBottom: 40,
    },
    inputWrapper: {
        gap: 8,
    },
    label: {
        color: '#e4e4e7', // Zinc 200
        fontSize: 14,
        fontWeight: '700',
        marginLeft: 4,
    },
    input: {
        backgroundColor: '#18181b', // Zinc 900
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 58,
        color: '#fff',
        borderWidth: 1.5,
        borderColor: '#27272a', // Zinc 800
        justifyContent: 'center',
    },
    inputTextPlaceholder: {
        color: '#52525b', // Zinc 600
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 4,
    },
    chip: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: '#18181b',
        borderWidth: 1.5,
        borderColor: '#27272a',
    },
    activeChip: {
        backgroundColor: '#d946ef15',
        borderColor: '#d946ef',
    },
    chipText: {
        color: '#71717a', // Zinc 500
        fontSize: 15,
        fontWeight: '600',
    },
    activeChipText: {
        color: '#d946ef',
        fontWeight: '700',
    },
    footer: {
        marginTop: 'auto',
        paddingTop: 20,
    },
    button: {
        backgroundColor: '#d946ef',
        borderRadius: 18,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#d946ef',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
        elevation: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
});
