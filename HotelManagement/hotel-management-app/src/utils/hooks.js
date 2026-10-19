import { useEffect, useRef, useState } from 'react';

// Form state with real-time validation: a field's error appears as soon as it is touched.
export function useForm(initial, validate) {
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({});
  const allErrors = validate(values);

  const errors = {};
  Object.keys(allErrors).forEach((key) => {
    if (touched[key]) errors[key] = allErrors[key];
  });

  const touch = (name) => setTouched((t) => ({ ...t, [name]: true }));
  const set = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    touch(name);
  };

  const bind = (name) => ({
    value: values[name],
    onChange: (e) => set(name, e.target.value),
    onBlur: () => touch(name),
  });

  // Marks every field (and any extra keys) as touched. Returns true when the form is valid.
  const touchAll = () => {
    const all = {};
    Object.keys(values).forEach((k) => (all[k] = true));
    Object.keys(allErrors).forEach((k) => (all[k] = true));
    setTouched(all);
    return Object.keys(allErrors).length === 0;
  };

  return { values, setValues, errors, allErrors, bind, set, touch, touchAll };
}

// Loads data from the API. Re-fetches when params change, and optionally every pollMs.
export function useResource(fetchFn, params, pollMs = 0) {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [tick, setTick] = useState(0);
  const key = JSON.stringify(params === undefined ? null : params);
  const keyRef = useRef(key);

  useEffect(() => {
    if (!pollMs) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), pollMs);
    return () => clearInterval(id);
  }, [pollMs]);

  useEffect(() => {
    let cancelled = false;
    if (keyRef.current !== key) {
      keyRef.current = key;
      setState((s) => ({ ...s, loading: true }));
    }
    fetchFn(key === 'null' ? undefined : JSON.parse(key))
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ ...s, loading: false, error: err.message }));
      });
    return () => {
      cancelled = true;
    };
    // fetchFn is an API function that never changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick]);

  return { ...state, reload: () => setTick((t) => t + 1) };
}

// Paged list: items and total come from the API
export function useList(fetchFn, params, pollMs = 0) {
  const r = useResource(fetchFn, params, pollMs);
  return {
    items: (r.data && r.data.items) || [],
    total: (r.data && r.data.total) || 0,
    loading: r.loading,
    error: r.error,
    reload: r.reload,
  };
}

// Filters plus the current page. Changing a filter jumps back to page 1.
export function useQueryState(initial, pageSize = 10) {
  const [q, setQ] = useState({ ...initial, page: 1 });
  const set = (patch) =>
    setQ((prev) => ({ ...prev, ...patch, page: 'page' in patch ? patch.page : 1 }));
  return { query: { ...q, pageSize }, set };
}
