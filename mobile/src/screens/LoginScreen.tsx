// Login (AUTH-01, AUTH-02, AUTH-04). Input is kept when sign-in fails; errors are business-readable only.
// Layout follows the "Login" board of the PQMP App Redesign.
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoginError } from '../api/auth';
import { Icon, type IconName } from '../components/Icon';
import { validateLogin, type LoginErrors, type LoginField, type LoginInput } from '../domain/login-validation';
import { APP_NAME, BRAND_NAME, BRAND_TAGLINE, colors, fonts, radius, spacing, type } from '../theme';

const FALLBACK_ERROR = 'We could not sign you in right now. Please try again.';

type Props = {
  onSubmit: (input: LoginInput) => Promise<void>;
  onForgotPassword: () => void;
  /** Shown on arrival, e.g. "Your session has expired" after an automatic sign-out (AUTH-03). */
  notice?: string | null;
};

export function LoginScreen({ onSubmit, onForgotPassword, notice = null }: Props) {
  const insets = useSafeAreaInsets();
  const passwordRef = useRef<TextInputInstance>(null);
  const [form, setForm] = useState<LoginInput>({ userId: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(notice);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field: LoginField) => (value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setFieldErrors(e => ({ ...e, [field]: undefined }));
    setFormError(null);
  };

  const submit = async () => {
    if (submitting) return;
    const errors = validateLogin(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onSubmit(form);
    } catch (err) {
      setFormError(err instanceof LoginError ? err.userMessage : FALLBACK_ERROR);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <View style={styles.heroRing} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />

          <View style={styles.brandRow} accessible accessibilityLabel={`${BRAND_NAME}, ${BRAND_TAGLINE}`}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>E</Text>
            </View>
            <View>
              <Text style={styles.brandName}>{BRAND_NAME}</Text>
              <Text style={styles.brandTagline}>{BRAND_TAGLINE}</Text>
            </View>
          </View>

          <Text
            style={styles.headline}
            accessibilityRole="header"
            accessibilityLabel={`${APP_NAME}. Every case, part and delivery. One tap away.`}
            testID="login.title"
          >
            Every case, part {'&'} delivery. One tap away.
          </Text>
          <Text style={styles.lede}>Raise a support case and follow it until the part reaches you.</Text>

          <View style={styles.chips} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Chip icon="file" label="Case raised" tint={colors.infoTint} color={colors.info} align="flex-start" />
            <Chip icon="truck" label="Part dispatched" tint={colors.warningTint} color={colors.warning} align="center" />
            <Chip icon="check" label="Delivered" tint={colors.successTint} color={colors.success} align="flex-end" />
          </View>
        </View>

        <View style={styles.form}>
          {formError && (
            <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite" testID="login.error">
              <Text style={styles.bannerText}>{formError}</Text>
            </View>
          )}

          <Field
            label="User ID"
            icon="user"
            error={fieldErrors.userId}
            testID="login.userId"
            value={form.userId}
            onChangeText={setField('userId')}
            placeholder="User ID"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            submitBehavior="submit"
            onSubmitEditing={() => passwordRef.current?.focus()}
            editable={!submitting}
          />

          <View>
            <Field
              ref={passwordRef}
              label="Password"
              icon="lock"
              error={fieldErrors.password}
              testID="login.password"
              value={form.password}
              onChangeText={setField('password')}
              placeholder="Enter password"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={submit}
              editable={!submitting}
              accessory={
                <Pressable
                  onPress={() => setShowPassword(s => !s)}
                  hitSlop={12}
                  style={styles.eye}
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  testID="login.togglePassword"
                >
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} color={colors.inkMuted} />
                </Pressable>
              }
            />
            <Pressable
              onPress={onForgotPassword}
              hitSlop={8}
              style={styles.forgot}
              accessibilityRole="link"
              testID="login.forgotPassword"
            >
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting}
            accessibilityRole="button"
            accessibilityState={{ disabled: submitting, busy: submitting }}
            accessibilityLabel="Sign in"
            testID="login.submit"
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, submitting && styles.buttonBusy]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.paper} testID="login.submitting" />
            ) : (
              <>
                <Text style={styles.buttonText}>Sign in</Text>
                <Icon name="arrowRight" color={colors.paper} />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type ChipProps = { icon: IconName; label: string; tint: string; color: string; align: 'flex-start' | 'center' | 'flex-end' };

function Chip({ icon, label, tint, color, align }: ChipProps) {
  return (
    <View style={[styles.chip, { alignSelf: align }]}>
      <View style={[styles.chipDot, { backgroundColor: tint }]}>
        <Icon name={icon} color={color} size={16} />
      </View>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

type FieldProps = TextInputProps & {
  label: string;
  icon: IconName;
  error?: string;
  testID: string;
  accessory?: React.ReactNode;
  ref?: React.Ref<TextInputInstance>;
};

function Field({ label, icon, error, testID, accessory, ref, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputBox, focused && styles.inputFocused, !!error && styles.inputInvalid]}>
        <Icon name={icon} color={colors.inkMuted} />
        <TextInput
          ref={ref}
          {...input}
          testID={testID}
          accessibilityLabel={label}
          accessibilityHint={error}
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          onFocus={e => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            input.onBlur?.(e);
          }}
        />
        {accessory}
      </View>
      {error && (
        <Text style={styles.fieldError} testID={`${testID}Error`}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  content: { flexGrow: 1 },

  hero: {
    backgroundColor: colors.brand,
    borderBottomLeftRadius: radius.hero,
    borderBottomRightRadius: radius.hero,
    paddingHorizontal: spacing.xl,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  heroRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    borderWidth: 40,
    borderColor: 'rgba(255,255,255,0.07)',
    right: -90,
    top: -70,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: { fontFamily: fonts.extrabold, fontSize: 18, color: colors.brand },
  brandName: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: -0.15, color: colors.paper },
  brandTagline: { ...type.caption, color: colors.paper, opacity: 0.9 },
  headline: { ...type.hero, color: colors.paper, marginTop: 34, marginBottom: 10 },
  lede: { ...type.bodySmall, color: colors.paper, opacity: 0.92 },

  chips: { gap: 10, marginTop: 22 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 40,
    paddingLeft: 6,
    paddingRight: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.paper,
    boxShadow: '0 8px 20px rgba(60,10,10,0.18)',
  },
  chipDot: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipText: { ...type.label, color: colors.ink },

  form: { paddingTop: 28, paddingHorizontal: spacing.xl, gap: 18 },
  banner: {
    backgroundColor: colors.dangerTint,
    borderColor: colors.dangerBorder,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  bannerText: { ...type.label, fontFamily: fonts.semibold, color: colors.danger },

  label: { ...type.label, color: colors.inkStrong, marginBottom: spacing.sm },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 54,
    paddingHorizontal: 14,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.paper,
    gap: 10,
  },
  inputFocused: { borderColor: colors.borderFocus, boxShadow: `0 0 0 4px ${colors.focusRing}` },
  inputInvalid: { borderColor: colors.danger },
  input: { ...type.body, flex: 1, height: '100%', color: colors.ink, paddingVertical: 0 },
  eye: { padding: 10, marginRight: -10 },
  fieldError: { ...type.caption, color: colors.danger, marginTop: 6 },

  link: { ...type.label, color: colors.primary },
  forgot: { alignSelf: 'flex-end', marginTop: 10, paddingVertical: 6 },

  button: {
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  buttonPressed: { backgroundColor: colors.primaryPressed },
  buttonBusy: { backgroundColor: colors.primaryDisabled },
  buttonText: { ...type.title, color: colors.paper },
});
