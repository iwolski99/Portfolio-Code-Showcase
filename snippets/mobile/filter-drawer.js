import { memo, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

function ThemeRow({ item, checked, label, onToggle }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onToggle(item.theme)}
      style={({ pressed }) => [styles.themeRow, pressed && styles.rowPressed]}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]} />
      <Text style={styles.themeName} numberOfLines={1}>{label}</Text>
      <Text style={styles.themeCount}>{item.count}</Text>
    </Pressable>
  );
}

export const FilterDrawer = memo(function FilterDrawer({
  open,
  onClose,
  themeStats,
  matchMode,
  onChangeMatchMode,
  selectedCount,
  matchCount,
  draftSelectedThemes,
  setDraftSelectedThemes,
  onApply,
  onReset,
  getThemeId,
  getThemeLabel,
}) {
  const [query, setQuery] = useState('');

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return themeStats;
    return themeStats.filter((item) => {
      const id = getThemeId(item.theme);
      const label = String(getThemeLabel(item.theme)).toLowerCase();
      return id.includes(q) || label.includes(q);
    });
  }, [getThemeId, getThemeLabel, query, themeStats]);

  const toggleTheme = (theme) => {
    const id = getThemeId(theme);
    setDraftSelectedThemes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter Themes</Text>
          <Pressable onPress={onClose}><Text style={styles.closeText}>Close</Text></Pressable>
        </View>

        <View style={styles.modeRow}>
          <Pressable onPress={() => onChangeMatchMode('and')} style={[styles.modeBtn, matchMode === 'and' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>Match All</Text>
          </Pressable>
          <Pressable onPress={() => onChangeMatchMode('or')} style={[styles.modeBtn, matchMode === 'or' && styles.modeBtnActive]}>
            <Text style={styles.modeText}>Match Any</Text>
          </Pressable>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search themes"
          style={styles.search}
        />

        <View style={styles.statsRow}>
          <Text style={styles.stat}>Selected: {selectedCount}</Text>
          <Text style={styles.stat}>Matches: {matchCount}</Text>
        </View>

        <FlatList
          data={list}
          keyExtractor={(item) => item.theme}
          renderItem={({ item }) => (
            <ThemeRow
              item={item}
              label={getThemeLabel(item.theme)}
              checked={draftSelectedThemes.has(getThemeId(item.theme))}
              onToggle={toggleTheme}
            />
          )}
        />

        <View style={styles.footer}>
          <Pressable onPress={onApply} style={styles.applyBtn}><Text style={styles.applyText}>Apply</Text></Pressable>
          <Pressable onPress={onReset} style={styles.resetBtn}><Text style={styles.resetText}>Reset</Text></Pressable>
        </View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '82%', backgroundColor: '#131416', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  header: { padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  title: { color: '#9aa2ad', fontWeight: '700' },
  closeText: { color: '#f3f5f7' },
  modeRow: { marginHorizontal: 16, flexDirection: 'row' },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  modeBtnActive: { backgroundColor: '#1b1d20' },
  modeText: { color: '#f1c94a', fontWeight: '700' },
  search: { margin: 16, borderWidth: 1, borderColor: '#2a2f36', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: '#f3f5f7' },
  statsRow: { marginHorizontal: 16, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between' },
  stat: { color: '#9aa2ad' },
  themeRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowPressed: { opacity: 0.85 },
  checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#2a2f36' },
  checkboxChecked: { backgroundColor: '#f1c94a', borderColor: '#f1c94a' },
  themeName: { flex: 1, color: '#f3f5f7' },
  themeCount: { color: '#9aa2ad', fontSize: 11 },
  footer: { padding: 16, flexDirection: 'row', gap: 10 },
  applyBtn: { flex: 1, backgroundColor: '#f1c94a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  applyText: { color: '#111214', fontWeight: '800' },
  resetBtn: { borderWidth: 1, borderColor: '#2a2f36', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  resetText: { color: '#9aa2ad', fontWeight: '800' },
});
