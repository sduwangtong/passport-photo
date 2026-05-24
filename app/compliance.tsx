import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';

import { templates } from '../data/templates';
import { processPhoto } from '../utils/imageProcessor';
import { processWithAI } from '../utils/aiProcessor';
import {
  checkCompliance,
  countryForTemplate,
  ComplianceResult,
  Severity,
} from '../utils/geminiCompliance';
import { photoStore } from '../utils/photoStore';
import {
  chooseDisplayedPhoto,
  canCompare,
  toggleMode,
  type CompareMode,
} from '../utils/compareView';
import { COUNTRY_CHECKLIST } from '../utils/geminiCompliance';
import { colors, radii } from '../theme';

export default function ComplianceScreen() {
  const { templateId, paperId } = useLocalSearchParams<{
    templateId: string;
    paperId: string;
  }>();

  const template = templates.find((t) => t.id === templateId) || templates[0];
  const country = countryForTemplate(template.id);

  const stored = photoStore.get();
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ComplianceResult | null>(null);
  const [base64, setBase64] = useState<string | null>(stored?.enhancedBase64 ?? null);
  const [original, setOriginal] = useState<string | null>(stored?.originalBase64 ?? null);
  const [fixing, setFixing] = useState(false);
  const [compareMode, setCompareMode] = useState<CompareMode>('enhanced');

  const runCheck = useCallback(
    async (sourceBase64: string) => {
      setChecking(true);
      setError(null);
      try {
        const r = await checkCompliance(sourceBase64, country);
        setResult(r);
        photoStore.patch({ compliance: r });
      } catch (e: any) {
        // Don't strand the user — surface a clean reason AND a fallback warn
        // verdict so the Continue path stays usable. Raw API JSON never reaches
        // the UI; we use the classified message from the thrown error.
        const cleanMsg = String(e?.message ?? 'AI check failed.').slice(0, 140);
        setError(cleanMsg);
        const fallback = {
          country,
          severity: 'warn' as const,
          summary: 'Auto-check unavailable — verify your photo against the country rules before continuing.',
          issues: [
            {
              code: 'CHECK_UNAVAILABLE',
              severity: 'warn' as const,
              message: cleanMsg,
              userAction: 'Compare your photo to the rules: plain white background, head centered, neutral expression, no glasses, both eyes open.',
            },
          ],
          metrics: {
            headHeightRatio: 0,
            eyeLineRatio: 0,
            faceCenterX: 0.5,
            backgroundUniform: false,
            expressionNeutral: true,
            eyesOpen: true,
            headStraight: true,
            lighting: 'even' as const,
          },
          suggestedAction: 'use_as_is' as const,
        };
        setResult(fallback);
        photoStore.patch({ compliance: fallback });
      } finally {
        setChecking(false);
      }
    },
    [country],
  );

  // First-paint: local crop → base64, then compliance check.
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!stored) {
        router.replace('/');
        return;
      }
      if (base64) {
        // Already enhanced (returning from auto-fix loop) — re-check.
        runCheck(base64);
        return;
      }
      const local = await processPhoto(
        stored.sourceUri,
        template.widthInch,
        template.heightInch,
        stored.photoWidth,
        stored.photoHeight,
      );
      if (cancelled) return;
      const seededOriginal = stored.originalBase64 ?? local;
      setBase64(local);
      setOriginal(seededOriginal);
      photoStore.patch({
        // Seed both — original captures the pre-AI state for the before/after view.
        originalBase64: seededOriginal,
        enhancedBase64: local,
      });
      runCheck(local);
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAutoFix = useCallback(async () => {
    if (!base64) return;
    setFixing(true);
    setError(null);
    try {
      const enhanced = await processWithAI(
        base64,
        template.name,
        template.widthMM,
        template.heightMM,
      );
      setBase64(enhanced);
      setCompareMode('enhanced');
      // Only update enhancedBase64; originalBase64 stays as the pre-AI baseline.
      photoStore.patch({ enhancedBase64: enhanced });
      await runCheck(enhanced);
    } catch (e: any) {
      setError(e?.message ?? 'Auto-fix failed');
    } finally {
      setFixing(false);
    }
  }, [base64, template, runCheck]);

  const handleContinue = useCallback(() => {
    router.push({
      pathname: '/preview',
      params: { templateId: template.id, paperId: paperId ?? 'us-letter' },
    });
  }, [template.id, paperId]);

  const handleRetake = useCallback(() => {
    photoStore.clear();
    router.replace('/');
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      bounces={false}
    >
      <View style={styles.infoBar}>
        <Text style={styles.infoCountry}>{country}</Text>
        <Text style={styles.infoDim}>
          {template.name} -- {template.widthMM} x {template.heightMM} mm
        </Text>
      </View>

      <View style={styles.photoWrap}>
        {(() => {
          const displayed = chooseDisplayedPhoto({
            mode: compareMode,
            original: original ?? undefined,
            enhanced: base64 ?? undefined,
          });
          return displayed ? (
            <Image source={{ uri: displayed }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          );
        })()}
        {canCompare(original ?? undefined, base64 ?? undefined) && (
          <View style={styles.compareTag}>
            <Text style={styles.compareTagText}>
              {compareMode === 'original' ? 'BEFORE' : 'AFTER'}
            </Text>
          </View>
        )}
        {(checking || fixing) && (
          <View style={styles.overlay}>
            <ActivityIndicator color={colors.white} />
            <Text style={styles.overlayText}>
              {fixing ? 'Auto-fixing photo...' : 'Checking compliance...'}
            </Text>
          </View>
        )}
      </View>

      {canCompare(original ?? undefined, base64 ?? undefined) && (
        <TouchableOpacity
          style={styles.compareToggle}
          onPress={() => setCompareMode((m) => toggleMode(m))}
          activeOpacity={0.8}
        >
          <Text style={styles.compareToggleText}>
            {compareMode === 'enhanced' ? 'View original' : 'View AI-enhanced'}
          </Text>
        </TouchableOpacity>
      )}

      <SeverityBadge severity={result?.severity ?? null} />

      {result && (
        <>
          {!!result.summary && (
            <Text style={styles.summary}>{result.summary}</Text>
          )}
          {result.issues.length > 0 ? (
            <View style={styles.issueList}>
              {result.issues.map((iss, i) => (
                <View key={`${iss.code}-${i}`} style={styles.issueRow}>
                  <View
                    style={[
                      styles.issueDot,
                      iss.severity === 'fail' && styles.issueDotFail,
                      iss.severity === 'warn' && styles.issueDotWarn,
                      iss.severity === 'pass' && styles.issueDotPass,
                    ]}
                  />
                  <View style={styles.issueText}>
                    <Text style={styles.issueCode}>{iss.code}</Text>
                    <Text style={styles.issueMsg}>{iss.message}</Text>
                    <Text style={styles.issueAction}>{iss.userAction}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.allClear}>No issues detected.</Text>
          )}
        </>
      )}

      {/* Suppress the standalone error box when we already have a result —
          the issue list communicates it without repeating the line. */}
      {error && !result && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* When the auto-check is unavailable, surface the country rules inline
          so the user can self-verify instead of trusting a wave of the hand. */}
      {result && result.issues.some((i) => i.code === 'CHECK_UNAVAILABLE') && (
        <View style={styles.rulesBlock}>
          <Text style={styles.rulesTitle}>WHAT WE CHECK FOR {country}</Text>
          {COUNTRY_CHECKLIST[country].map((rule, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleBullet}>—</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        {result?.suggestedAction === 'auto_fix' && (
          <TouchableOpacity
            style={[styles.btn, styles.btnAccent]}
            onPress={handleAutoFix}
            disabled={fixing}
            activeOpacity={0.8}
          >
            <Text style={styles.btnAccentText}>Auto-fix with AI</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.btn,
            result?.severity === 'fail' ? styles.btnOutline : styles.btnPrimary,
          ]}
          onPress={handleContinue}
          disabled={checking || !base64}
          activeOpacity={0.8}
        >
          <Text
            style={
              result?.severity === 'fail' ? styles.btnOutlineText : styles.btnPrimaryText
            }
          >
            {result?.severity === 'fail' ? 'Continue anyway' : 'Continue to Preview'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.btnGhost]}
          onPress={handleRetake}
          activeOpacity={0.8}
        >
          <Text style={styles.btnGhostText}>Try another photo</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function SeverityBadge({ severity }: { severity: Severity | null }) {
  if (!severity) return null;
  const label = severity === 'pass' ? 'COMPLIANT' : severity === 'warn' ? 'WARNINGS' : 'NOT COMPLIANT';
  const style =
    severity === 'pass'
      ? styles.badgePass
      : severity === 'warn'
        ? styles.badgeWarn
        : styles.badgeFail;
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  infoBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    marginBottom: 16,
  },
  infoCountry: { fontSize: 13, fontWeight: '700', color: colors.primary, letterSpacing: 1.5 },
  infoDim: { fontSize: 13, color: colors.slate },
  photoWrap: {
    alignSelf: 'center',
    width: 260,
    height: 320,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: colors.divider,
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10,10,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  overlayText: { color: colors.white, fontSize: 13, fontWeight: '600' },
  compareTag: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(10,10,10,0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  compareTagText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  compareToggle: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  compareToggleText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: 12,
  },
  badgePass: { backgroundColor: '#16A34A' },
  badgeWarn: { backgroundColor: '#D97706' },
  badgeFail: { backgroundColor: '#DC2626' },
  badgeText: { color: colors.white, fontWeight: '700', fontSize: 12, letterSpacing: 1.5 },
  summary: { fontSize: 14, color: colors.primary, marginBottom: 12, lineHeight: 20 },
  issueList: { gap: 10, marginBottom: 16 },
  issueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  issueDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    backgroundColor: colors.slate,
  },
  issueDotPass: { backgroundColor: '#16A34A' },
  issueDotWarn: { backgroundColor: '#D97706' },
  issueDotFail: { backgroundColor: '#DC2626' },
  issueText: { flex: 1 },
  issueCode: { fontSize: 11, fontWeight: '700', color: colors.slate, letterSpacing: 1.5 },
  issueMsg: { fontSize: 14, color: colors.primary, marginTop: 2 },
  issueAction: { fontSize: 13, color: colors.accent, marginTop: 4, fontWeight: '500' },
  allClear: { fontSize: 14, color: colors.slate, marginBottom: 16 },
  errorBox: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: radii.sm,
    marginBottom: 16,
  },
  errorText: { fontSize: 13, color: '#991B1B' },
  rulesBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: radii.sm,
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.slate,
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  ruleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
  },
  ruleBullet: {
    color: colors.slate,
    fontSize: 14,
    lineHeight: 20,
  },
  ruleText: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  actions: { gap: 12, marginTop: 8 },
  btn: { height: 52, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  btnAccent: { backgroundColor: colors.accent },
  btnAccentText: { color: colors.white, fontSize: 16, fontWeight: '700' },
  btnOutline: { borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.background },
  btnOutlineText: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  btnGhost: { backgroundColor: colors.background },
  btnGhostText: { color: colors.slate, fontSize: 14, fontWeight: '600' },
});
