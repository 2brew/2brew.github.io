
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    const active_docs = new Set();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = node.ownerDocument;
        active_docs.add(doc);
        const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style')).sheet);
        const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});
        if (!current_rules[name]) {
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            active_docs.forEach(doc => {
                const stylesheet = doc.__svelte_stylesheet;
                let i = stylesheet.cssRules.length;
                while (i--)
                    stylesheet.deleteRule(i);
                doc.__svelte_rules = {};
            });
            active_docs.clear();
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_out_transition(node, fn, params) {
        let config = fn(node, params);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config();
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    function regexparam (str, loose) {
    	if (str instanceof RegExp) return { keys:false, pattern:str };
    	var c, o, tmp, ext, keys=[], pattern='', arr = str.split('/');
    	arr[0] || arr.shift();

    	while (tmp = arr.shift()) {
    		c = tmp[0];
    		if (c === '*') {
    			keys.push('wild');
    			pattern += '/(.*)';
    		} else if (c === ':') {
    			o = tmp.indexOf('?', 1);
    			ext = tmp.indexOf('.', 1);
    			keys.push( tmp.substring(1, !!~o ? o : !!~ext ? ext : tmp.length) );
    			pattern += !!~o && !~ext ? '(?:/([^/]+?))?' : '/([^/]+?)';
    			if (!!~ext) pattern += (!!~o ? '?' : '') + '\\' + tmp.substring(ext);
    		} else {
    			pattern += '/' + tmp;
    		}
    	}

    	return {
    		keys: keys,
    		pattern: new RegExp('^' + pattern + (loose ? '(?=$|\/)' : '\/?$'), 'i')
    	};
    }

    /* node_modules/svelte-spa-router/Router.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1, Object: Object_1, console: console_1 } = globals;

    // (209:0) {:else}
    function create_else_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return { $$inline: true };
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    		switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[10]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());
    					switch_instance.$on("routeEvent", /*routeEvent_handler_1*/ ctx[10]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(209:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (207:0) {#if componentParams}
    function create_if_block(ctx) {
    	let switch_instance_anchor;
    	let current;
    	var switch_value = /*component*/ ctx[0];

    	function switch_props(ctx) {
    		return {
    			props: { params: /*componentParams*/ ctx[1] },
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props(ctx));
    		switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[9]);
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = {};
    			if (dirty & /*componentParams*/ 2) switch_instance_changes.params = /*componentParams*/ ctx[1];

    			if (switch_value !== (switch_value = /*component*/ ctx[0])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props(ctx));
    					switch_instance.$on("routeEvent", /*routeEvent_handler*/ ctx[9]);
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(207:0) {#if componentParams}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*componentParams*/ ctx[1]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function wrap(route, userData, ...conditions) {
    	// Check if we don't have userData
    	if (userData && typeof userData == "function") {
    		conditions = conditions && conditions.length ? conditions : [];
    		conditions.unshift(userData);
    		userData = undefined;
    	}

    	// Parameter route and each item of conditions must be functions
    	if (!route || typeof route != "function") {
    		throw Error("Invalid parameter route");
    	}

    	if (conditions && conditions.length) {
    		for (let i = 0; i < conditions.length; i++) {
    			if (!conditions[i] || typeof conditions[i] != "function") {
    				throw Error("Invalid parameter conditions[" + i + "]");
    			}
    		}
    	}

    	// Returns an object that contains all the functions to execute too
    	const obj = { route, userData };

    	if (conditions && conditions.length) {
    		obj.conditions = conditions;
    	}

    	// The _sveltesparouter flag is to confirm the object was created by this router
    	Object.defineProperty(obj, "_sveltesparouter", { value: true });

    	return obj;
    }

    /**
     * @typedef {Object} Location
     * @property {string} location - Location (page/view), for example `/book`
     * @property {string} [querystring] - Querystring from the hash, as a string not parsed
     */
    /**
     * Returns the current location from the hash.
     *
     * @returns {Location} Location object
     * @private
     */
    function getLocation() {
    	const hashPosition = window.location.href.indexOf("#/");

    	let location = hashPosition > -1
    	? window.location.href.substr(hashPosition + 1)
    	: "/";

    	// Check if there's a querystring
    	const qsPosition = location.indexOf("?");

    	let querystring = "";

    	if (qsPosition > -1) {
    		querystring = location.substr(qsPosition + 1);
    		location = location.substr(0, qsPosition);
    	}

    	return { location, querystring };
    }

    const loc = readable(getLocation(), // eslint-disable-next-line prefer-arrow-callback
    function start(set) {
    	const update = () => {
    		set(getLocation());
    	};

    	window.addEventListener("hashchange", update, false);

    	return function stop() {
    		window.removeEventListener("hashchange", update, false);
    	};
    });

    const location = derived(loc, $loc => $loc.location);
    const querystring = derived(loc, $loc => $loc.querystring);

    function push(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		window.location.hash = (location.charAt(0) == "#" ? "" : "#") + location;
    	});
    }

    function pop() {
    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		window.history.back();
    	});
    }

    function replace(location) {
    	if (!location || location.length < 1 || location.charAt(0) != "/" && location.indexOf("#/") !== 0) {
    		throw Error("Invalid parameter location");
    	}

    	// Execute this code when the current call stack is complete
    	return nextTickPromise(() => {
    		const dest = (location.charAt(0) == "#" ? "" : "#") + location;

    		try {
    			window.history.replaceState(undefined, undefined, dest);
    		} catch(e) {
    			// eslint-disable-next-line no-console
    			console.warn("Caught exception while replacing the current page. If you're running this in the Svelte REPL, please note that the `replace` method might not work in this environment.");
    		}

    		// The method above doesn't trigger the hashchange event, so let's do that manually
    		window.dispatchEvent(new Event("hashchange"));
    	});
    }

    function link(node) {
    	// Only apply to <a> tags
    	if (!node || !node.tagName || node.tagName.toLowerCase() != "a") {
    		throw Error("Action \"link\" can only be used with <a> tags");
    	}

    	// Destination must start with '/'
    	const href = node.getAttribute("href");

    	if (!href || href.length < 1 || href.charAt(0) != "/") {
    		throw Error("Invalid value for \"href\" attribute");
    	}

    	// Add # to every href attribute
    	node.setAttribute("href", "#" + href);
    }

    function nextTickPromise(cb) {
    	return new Promise(resolve => {
    			setTimeout(
    				() => {
    					resolve(cb());
    				},
    				0
    			);
    		});
    }

    function instance($$self, $$props, $$invalidate) {
    	let $loc,
    		$$unsubscribe_loc = noop;

    	validate_store(loc, "loc");
    	component_subscribe($$self, loc, $$value => $$invalidate(4, $loc = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_loc());
    	let { routes = {} } = $$props;
    	let { prefix = "" } = $$props;

    	/**
     * Container for a route: path, component
     */
    	class RouteItem {
    		/**
     * Initializes the object and creates a regular expression from the path, using regexparam.
     *
     * @param {string} path - Path to the route (must start with '/' or '*')
     * @param {SvelteComponent} component - Svelte component for the route
     */
    		constructor(path, component) {
    			if (!component || typeof component != "function" && (typeof component != "object" || component._sveltesparouter !== true)) {
    				throw Error("Invalid component object");
    			}

    			// Path must be a regular or expression, or a string starting with '/' or '*'
    			if (!path || typeof path == "string" && (path.length < 1 || path.charAt(0) != "/" && path.charAt(0) != "*") || typeof path == "object" && !(path instanceof RegExp)) {
    				throw Error("Invalid value for \"path\" argument");
    			}

    			const { pattern, keys } = regexparam(path);
    			this.path = path;

    			// Check if the component is wrapped and we have conditions
    			if (typeof component == "object" && component._sveltesparouter === true) {
    				this.component = component.route;
    				this.conditions = component.conditions || [];
    				this.userData = component.userData;
    			} else {
    				this.component = component;
    				this.conditions = [];
    				this.userData = undefined;
    			}

    			this._pattern = pattern;
    			this._keys = keys;
    		}

    		/**
     * Checks if `path` matches the current route.
     * If there's a match, will return the list of parameters from the URL (if any).
     * In case of no match, the method will return `null`.
     *
     * @param {string} path - Path to test
     * @returns {null|Object.<string, string>} List of paramters from the URL if there's a match, or `null` otherwise.
     */
    		match(path) {
    			// If there's a prefix, remove it before we run the matching
    			if (prefix && path.startsWith(prefix)) {
    				path = path.substr(prefix.length) || "/";
    			}

    			// Check if the pattern matches
    			const matches = this._pattern.exec(path);

    			if (matches === null) {
    				return null;
    			}

    			// If the input was a regular expression, this._keys would be false, so return matches as is
    			if (this._keys === false) {
    				return matches;
    			}

    			const out = {};
    			let i = 0;

    			while (i < this._keys.length) {
    				out[this._keys[i]] = matches[++i] || null;
    			}

    			return out;
    		}

    		/**
     * Dictionary with route details passed to the pre-conditions functions, as well as the `routeLoaded` and `conditionsFailed` events
     * @typedef {Object} RouteDetail
     * @property {SvelteComponent} component - Svelte component
     * @property {string} name - Name of the Svelte component
     * @property {string} location - Location path
     * @property {string} querystring - Querystring from the hash
     * @property {Object} [userData] - Custom data passed by the user
     */
    		/**
     * Executes all conditions (if any) to control whether the route can be shown. Conditions are executed in the order they are defined, and if a condition fails, the following ones aren't executed.
     * 
     * @param {RouteDetail} detail - Route detail
     * @returns {bool} Returns true if all the conditions succeeded
     */
    		checkConditions(detail) {
    			for (let i = 0; i < this.conditions.length; i++) {
    				if (!this.conditions[i](detail)) {
    					return false;
    				}
    			}

    			return true;
    		}
    	}

    	// Set up all routes
    	const routesList = [];

    	if (routes instanceof Map) {
    		// If it's a map, iterate on it right away
    		routes.forEach((route, path) => {
    			routesList.push(new RouteItem(path, route));
    		});
    	} else {
    		// We have an object, so iterate on its own properties
    		Object.keys(routes).forEach(path => {
    			routesList.push(new RouteItem(path, routes[path]));
    		});
    	}

    	// Props for the component to render
    	let component = null;

    	let componentParams = null;

    	// Event dispatcher from Svelte
    	const dispatch = createEventDispatcher();

    	// Just like dispatch, but executes on the next iteration of the event loop
    	const dispatchNextTick = (name, detail) => {
    		// Execute this code when the current call stack is complete
    		setTimeout(
    			() => {
    				dispatch(name, detail);
    			},
    			0
    		);
    	};

    	const writable_props = ["routes", "prefix"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Router", $$slots, []);

    	function routeEvent_handler(event) {
    		bubble($$self, event);
    	}

    	function routeEvent_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    	};

    	$$self.$capture_state = () => ({
    		readable,
    		derived,
    		wrap,
    		getLocation,
    		loc,
    		location,
    		querystring,
    		push,
    		pop,
    		replace,
    		link,
    		nextTickPromise,
    		createEventDispatcher,
    		regexparam,
    		routes,
    		prefix,
    		RouteItem,
    		routesList,
    		component,
    		componentParams,
    		dispatch,
    		dispatchNextTick,
    		$loc
    	});

    	$$self.$inject_state = $$props => {
    		if ("routes" in $$props) $$invalidate(2, routes = $$props.routes);
    		if ("prefix" in $$props) $$invalidate(3, prefix = $$props.prefix);
    		if ("component" in $$props) $$invalidate(0, component = $$props.component);
    		if ("componentParams" in $$props) $$invalidate(1, componentParams = $$props.componentParams);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*component, $loc*/ 17) {
    			// Handle hash change events
    			// Listen to changes in the $loc store and update the page
    			 {
    				// Find a route matching the location
    				$$invalidate(0, component = null);

    				let i = 0;

    				while (!component && i < routesList.length) {
    					const match = routesList[i].match($loc.location);

    					if (match) {
    						const detail = {
    							component: routesList[i].component,
    							name: routesList[i].component.name,
    							location: $loc.location,
    							querystring: $loc.querystring,
    							userData: routesList[i].userData
    						};

    						// Check if the route can be loaded - if all conditions succeed
    						if (!routesList[i].checkConditions(detail)) {
    							// Trigger an event to notify the user
    							dispatchNextTick("conditionsFailed", detail);

    							break;
    						}

    						$$invalidate(0, component = routesList[i].component);

    						// Set componentParams onloy if we have a match, to avoid a warning similar to `<Component> was created with unknown prop 'params'`
    						// Of course, this assumes that developers always add a "params" prop when they are expecting parameters
    						if (match && typeof match == "object" && Object.keys(match).length) {
    							$$invalidate(1, componentParams = match);
    						} else {
    							$$invalidate(1, componentParams = null);
    						}

    						dispatchNextTick("routeLoaded", detail);
    					}

    					i++;
    				}
    			}
    		}
    	};

    	return [
    		component,
    		componentParams,
    		routes,
    		prefix,
    		$loc,
    		RouteItem,
    		routesList,
    		dispatch,
    		dispatchNextTick,
    		routeEvent_handler,
    		routeEvent_handler_1
    	];
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { routes: 2, prefix: 3 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Router",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get routes() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set routes(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get prefix() {
    		throw new Error_1("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set prefix(value) {
    		throw new Error_1("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var en = {
    	system: {
    		aeropress: "AeroPress",
    		moka: "Moka",
    		v60: "V60"
    	},
    	global: {
    		g: "g",
    		ml: "ml",
    		loading: "Loading...",
    		paused: "Paused",
    		enjoy: "Enjoy your coffee",
    		inverted: "Inverted"
    	},
    	grind: [
    		"Espresso",
    		"Extra Fine",
    		"Fine",
    		"Medium Fine",
    		"Medium",
    		"Medium Coarse",
    		"Coarse"
    	],
    	step: {
    		pour: "Pour water",
    		add: "Add coffee",
    		stir: "Stir",
    		wait: "Wait",
    		place: "Place plunger",
    		press: "Press",
    		bloom: "Bloom",
    		lid: "Put the lid on",
    		swirl: "Swirl",
    		invert: "Invert",
    		brew: "Brew",
    		heat: "Heat the water",
    		filter: "Place filter"
    	}
    };
    var ru = {
    	system: {
    		aeropress: "Аэропресс",
    		moka: "Гейзер",
    		v60: "V60"
    	},
    	global: {
    		g: "г",
    		ml: "мл",
    		loading: "Загрузка...",
    		paused: "Пауза",
    		enjoy: "Кофе готов!",
    		inverted: "Инвертированный"
    	},
    	grind: [
    		"Для эспрессо",
    		"Очень мелкий",
    		"Мелкий",
    		"Средне мелкий",
    		"Средний",
    		"Средне крупный",
    		"Крупный"
    	],
    	step: {
    		pour: "Наливайте воду",
    		add: "Добавьте кофе",
    		stir: "Мешайте",
    		wait: "Ждите",
    		place: "Поместите пресс",
    		press: "Жмите пресс",
    		bloom: "Цветение",
    		lid: "Поставьте крышку",
    		swirl: "Вращайте",
    		invert: "Переверните",
    		brew: "Варите",
    		heat: "Нагрейте воду",
    		filter: "Положите фильтр"
    	}
    };
    var pl = {
    	system: {
    		aeropress: "AeroPress",
    		moka: "Kawiarka",
    		v60: "V60"
    	},
    	global: {
    		g: "g",
    		ml: "ml",
    		loading: "Ładowanie...",
    		paused: "Pauza",
    		enjoy: "Kawa jest gotowa!",
    		inverted: "Odwrócony"
    	},
    	grind: [
    		"Espresso",
    		"Extra Fine",
    		"Fine",
    		"Medium Fine",
    		"Medium",
    		"Medium Coarse",
    		"Coarse"
    	],
    	step: {
    		pour: "Nalej wodę",
    		add: "Dodaj kawę",
    		stir: "Wymieszaj",
    		wait: "Czekaj",
    		place: "Umieść prasę",
    		press: "Delikatnie wyciskaj",
    		bloom: "Proces palenia",
    		lid: "Załóż pokrywę",
    		swirl: "Obracaj po kołu",
    		invert: "Odwróć",
    		brew: "Zaparzaj",
    		heat: "Podgrzej wodę",
    		filter: "Umieść filtr"
    	}
    };
    var i18n = {
    	en: en,
    	ru: ru,
    	pl: pl
    };

    const initialLang = (['en', 'ru'].indexOf(localStorage.getItem('lang')) !== -1) ? localStorage.getItem('lang') : 'en';

    const translations = writable({
      tt: i18n[initialLang],
      language: initialLang
    });

    function tt(ttObj, path, def) {
      return pathOr(ttObj.tt, path, def || path);
    }
    function setLanguage(lang = 'en') {
      if (['en', 'ru', 'pl'].indexOf(lang) !== -1) {
        localStorage.setItem('lang', lang);
        translations.set({tt: i18n[lang], language: lang});
      }
    }

    var aeropress = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 176 176\">\n    <g fill-rule=\"evenodd\">\n        <rect width=\"48\" height=\"16\" x=\"64\" y=\"144\" rx=\"8\"/>\n        <path d=\"M110 40c5.523 0 10 4.477 10 10v92c0 5.523-4.477 10-10 10H66c-5.523 0-10-4.477-10-10V50c0-5.523 4.477-10 10-10h44zm-2 8H68a4 4 0 00-4 4v88a4 4 0 004 4h40a4 4 0 004-4V52a4 4 0 00-4-4z\"/>\n        <rect width=\"80\" height=\"8\" x=\"48\" y=\"144\" rx=\"4\"/>\n        <path d=\"M99 24a9 9 0 019 9v90a9 9 0 01-9 9H77a9 9 0 01-9-9V33a9 9 0 019-9h22zm-3 8H80a4 4 0 00-4 4v84a4 4 0 004 4h16a4 4 0 004-4V36a4 4 0 00-4-4z\"/>\n        <rect width=\"64\" height=\"8\" x=\"56\" y=\"24\" rx=\"4\"/>\n        <rect width=\"16\" height=\"8\" x=\"88\" y=\"56\" rx=\"4\"/>\n        <rect width=\"16\" height=\"8\" x=\"88\" y=\"80\" rx=\"4\"/>\n        <rect width=\"16\" height=\"8\" x=\"88\" y=\"104\" rx=\"4\"/>\n    </g>\n</svg>";

    var moka = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 176 176\">\n    <g fill-rule=\"evenodd\">\n        <path d=\"M120 120l16.764 33.528c2.47 4.94.468 10.946-4.472 13.416A10 10 0 01127.82 168H48.18c-5.523 0-10-4.477-10-10a10 10 0 011.056-4.472L56 120h9.476l-17.494 34.177a4 4 0 003.36 5.818l.2.005h72.918a4 4 0 003.652-5.631l-.092-.192L110.523 120H120zm-51.056-8h41.622a8 8 0 016.784 3.76L120 120H56c2.451-4.903 7.463-8 12.944-8zM56.984 80l-20.48-42.255A4 4 0 0140.102 32h87.72c5.522 0 10 4.477 10 10a10 10 0 01-1.057 4.472L120.003 80h-9.476l17.5-34.189a4 4 0 00-3.353-5.817l-.2-.006-77.836-.137a1 1 0 00-.94 1.348l.047.107L65.52 80h-8.535z\"/>\n        <path d=\"M120 76v18c0 5.523-4.477 10-10 10H66c-5.523 0-10-4.477-10-10V76h64zm-12 7H68a4 4 0 00-4 4v5a4 4 0 004 4h40a4 4 0 004-4v-5a4 4 0 00-4-4z\"/>\n        <path d=\"M117 96v24H59V96h58zm-10 8H71a4 4 0 100 8h36a4 4 0 100-8z\"/>\n        <path d=\"M78.47 112H79a3.47 3.47 0 013.434 3.96l-6.943 48.606A4 4 0 0171.53 168H71a3.47 3.47 0 01-3.434-3.96l6.943-48.606A4 4 0 0178.47 112zM97 112h.53a4 4 0 013.96 3.434l6.944 48.606A3.47 3.47 0 01105 168h-.53a4 4 0 01-3.96-3.434l-6.944-48.606A3.47 3.47 0 0197 112zM97.579 83H97a3.421 3.421 0 01-3.38-3.952l6.85-43.668A4 4 0 01104.42 32H105a3.421 3.421 0 013.38 3.952l-6.85 43.668A4 4 0 0197.58 83zM79 83h-.579a4 4 0 01-3.951-3.38l-6.85-43.668A3.421 3.421 0 0171 32h.579a4 4 0 013.951 3.38l6.85 43.668A3.421 3.421 0 0179 83z\"/>\n        <path d=\"M88 20c16.71 0 31.578 4.698 41.091 12H115.24c-7.837-3.162-17.192-5-27.24-5-10.048 0-19.403 1.838-27.24 5H46.908C56.422 24.698 71.29 20 88 20z\"/>\n        <path d=\"M84.595 8h6.683a4 4 0 013.946 4.658l-1.667 10A4 4 0 0189.611 26h-3.626a4 4 0 01-3.962-3.45l-1.39-10A4 4 0 0184.595 8z\"/>\n        <rect width=\"27\" height=\"16\" x=\"129\" y=\"32\" rx=\"4\"/>\n        <rect width=\"11\" height=\"56\" x=\"145\" y=\"32\" rx=\"4\"/>\n    </g>\n</svg>";

    var v60 = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 176 176\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <rect width=\"112\" height=\"8\" x=\"32\" y=\"128\" rx=\"4\"/>\n        <rect width=\"128\" height=\"8\" x=\"24\" y=\"32\" rx=\"4\"/>\n        <path d=\"M64 147.945a4 4 0 003.8 3.995l.2.005h40a4 4 0 003.995-3.8l.005-.2V128c4.5.498 8 4.313 8 8.945v14a9 9 0 01-9 9H65a9 9 0 01-9-9v-13c0-4.838 3.436-8.873 8-9.8v19.8zM64 128L24 36h8l40 92zM104 128l40-92h8l-40 92z\"/>\n        <path d=\"M148.631 48c8.837 0 16 7.163 16 16a16 16 0 01-.16 2.263l-3.43 24A16 16 0 01145.204 104h-7.675c-6.44 0-11.99-3.803-14.528-9.286l8.031-18.472-2.038 10.19a8 8 0 007.596 9.564l.249.004h7.683a8 8 0 007.79-6.178l.055-.253 4.8-24A8 8 0 00149.32 56h-7.683c-.654 0-1.293.08-1.906.23L143.31 48h5.321zM124 48h-.877a4 4 0 00-3.88 3.03L104 112l22.596-60.255A2.772 2.772 0 00124 48zM100 48h-.242a4 4 0 00-3.992 3.75L92 112l11.263-60.069A3.32 3.32 0 00100 48zM76.233 48H76a3.328 3.328 0 00-3.272 3.933L83.845 112l-3.619-60.24A4 4 0 0076.233 48zM52.877 48H52a2.772 2.772 0 00-2.596 3.745L72 112 56.757 51.03a4 4 0 00-3.88-3.03z\"/>\n        <rect width=\"112\" height=\"8\" x=\"32\" y=\"128\" rx=\"4\"/>\n    </g>\n</svg>";

    var _invert = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <path d=\"M64 6.5c9.248 0 17.784 6.343 23.994 17.27C94.053 34.432 97.5 48.75 97.5 64c0 31.33-14.48 56.982-32.94 57.492l-.56.008v-3c16.62 0 30.5-24.29 30.5-54.5 0-14.75-3.324-28.559-9.114-38.747C79.66 15.179 72.019 9.5 64 9.5c-7.977 0-15.582 5.62-21.299 15.6-3.317 5.792-5.864 12.837-7.427 20.615l7.798.68-11.115 18.103-7.813-19.754 8.123.71c1.618-8.214 4.3-15.68 7.831-21.845C46.302 12.779 54.798 6.5 64 6.5z\"/>\n</svg>";

    var _lid = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M64 16c26.51 0 48 21.49 48 48s-21.49 48-48 48-48-21.49-48-48 21.49-48 48-48zM48 92a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zM40 76a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zM32 60a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zM40 44a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zM48 28a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8zm16 0a4 4 0 100 8 4 4 0 000-8z\"/>\n        <rect width=\"24\" height=\"16\" x=\"18.059\" y=\"22.059\" rx=\"8\" transform=\"rotate(-45 30.059 30.059)\"/>\n        <rect width=\"24\" height=\"16\" x=\"85.941\" y=\"89.941\" rx=\"8\" transform=\"rotate(-45 97.941 97.941)\"/>\n        <rect width=\"24\" height=\"16\" x=\"18.059\" y=\"89.941\" rx=\"8\" transform=\"rotate(-135 30.059 97.941)\"/>\n        <rect width=\"24\" height=\"16\" x=\"85.941\" y=\"22.059\" rx=\"8\" transform=\"rotate(-135 97.941 30.059)\"/>\n    </g>\n</svg>";

    var _temp = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"none\" fill-rule=\"evenodd\">\n        <path fill=\"#D8D8D8\" d=\"M56.269 43h16.06v38.216c7.78 9.856 9.037 18.45 3.768 25.784C68 111.978 60 111.978 53.969 107c-6.646-7.333-5.88-15.928 2.3-25.784V43z\"/>\n        <path fill=\"#000\" d=\"M64 12c6.627 0 12 5.373 12 12v55.999c4.858 3.649 8 9.458 8 16.001 0 11.046-8.954 20-20 20s-20-8.954-20-20c0-6.543 3.142-12.353 8-16.002V24c0-6.627 5.373-12 12-12zm0 8a4 4 0 00-4 4v60.683C55.34 86.33 52 90.775 52 96c0 6.627 5.373 12 12 12s12-5.373 12-12c0-5.225-3.339-9.67-8-11.317V24a4 4 0 00-4-4z\"/>\n    </g>\n</svg>";

    var _add = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M100.732 74.913c-.21 7.375-7.917 13.625-18.292 15.411-2.535-3.782-6.372-7.322-11.187-9.99a36.213 36.213 0 00-2.712-1.36l.268-.002c7.999-.14 10.24-3.055 15.936-3.779 3.796-.482 9.125-.575 15.987-.28zm.002-.499c.003.166.002.331-.002.496l.01.004c-5.372-2.24-10.725-3.313-16.058-3.22-7.999.14-10.24 3.054-15.936 3.778-3.453.44-8.173.556-14.161.35l-.67-.023a.2.2 0 00-.082.386l.096.037c-.377.035-.748.079-1.115.132a10.983 10.983 0 01-.075-1.102c-.154-8.836 10.465-16.185 23.718-16.417 13.252-.231 24.121 6.744 24.275 15.579zM81.996 36.581c.003.166.002.331-.002.496l.011.004c-5.373-2.24-10.726-3.313-16.059-3.22-7.998.14-10.24 3.055-15.936 3.779-3.452.438-8.173.555-14.161.35l-.67-.024a.2.2 0 00-.082.386c.25.098.447.174.594.229 4.81 1.789 9.603 2.641 14.38 2.558 7.999-.14 10.24-3.055 15.937-3.779 3.795-.482 9.124-.575 15.986-.28-.246 8.612-10.713 15.69-23.715 15.918-13.253.23-24.121-6.744-24.275-15.58-.155-8.834 10.464-16.184 23.717-16.416 13.253-.23 24.121 6.744 24.275 15.58z\"/>\n        <path d=\"M41.757 83.692c.08-.145.164-.288.25-.428l-.008-.01c3.534 4.627 7.633 8.233 12.298 10.819 6.996 3.878 10.395 2.474 15.69 4.695 3.21 1.347 7.356 3.606 12.44 6.777l.568.357a.2.2 0 00.263-.294c-.167-.21-.3-.375-.4-.495-3.27-3.954-6.995-7.09-11.174-9.406-6.997-3.878-10.395-2.474-15.69-4.696-3.53-1.48-8.19-4.064-13.985-7.75 4.518-7.335 17.122-8.232 28.496-1.928 11.593 6.426 17.518 17.9 13.234 25.63-4.284 7.728-17.155 8.784-28.748 2.358s-17.518-17.9-13.234-25.63z\"/>\n    </g>\n</svg>";

    var _place = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path fill-rule=\"nonzero\" d=\"M62.77 43.23l3 .04-.02 1.5-.254 19.001 8 .107-9.753 18.872-9.246-19.125 7.999.106.254-19.001.02-1.5z\"/>\n        <rect width=\"80\" height=\"8\" x=\"24\" y=\"16\" rx=\"4\"/>\n        <path d=\"M82 16a6 6 0 016 6v75c0 8.284-6.716 15-15 15H55c-8.284 0-15-6.716-15-15V22a6 6 0 016-6h36zm-8 8H54a6 6 0 00-6 6v66a8 8 0 008 8h16a8 8 0 008-8V30a6 6 0 00-6-6z\"/>\n    </g>\n</svg>";

    var _pour = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M78.142 88c7.302 10.054 10.548 18.114 9.736 24.178-1.217 9.096-17.038 9.096-19.472 0-1.623-6.064 1.622-14.124 9.736-24.178zm-16-40c7.302 10.054 10.548 18.114 9.736 24.178-1.217 9.096-17.038 9.096-19.472 0-1.623-6.064 1.622-14.124 9.736-24.178zM-34.9 69.053c11.454 8.378 20.913 10.099 28.38 5.163 19.563-12.935 25.04-33.04 44.457-46.038 7.071-2.44 13.223-1.133 18.456 3.921l4.168-4.316c-7.193-10.022-16.653-11.743-28.378-5.162-18.83 10.567-27.828 34.574-44.459 46.037-6.13 1.495-11.818-.292-17.066-5.36l-5.557 5.755z\"/>\n    </g>\n</svg>";

    var _bloom = "<svg xmlns=\"http://www.w3.org/2000/svg\"  viewBox=\"0 0 128 128\">\n    <g fill=\"none\" fill-rule=\"evenodd\" stroke=\"#000\">\n        <path stroke-width=\"7\" d=\"M67.265 14.52a7.477 7.477 0 00-5.731-.331 7.477 7.477 0 00-4.286 3.818L51.55 29.793l-11.941-5.366a7.5 7.5 0 00-10.345 8.68l3.21 12.692-12.595 3.565a7.5 7.5 0 00-2.345 13.3L28.15 70.32 20.793 81.15a7.5 7.5 0 006.752 11.695l13.056-.958 1.324 13.024a7.5 7.5 0 0012.69 4.618L64 100.402l9.385 9.126a7.5 7.5 0 0012.69-4.618L87.4 91.886l13.056.958a7.5 7.5 0 006.752-11.695L99.849 70.32l10.617-7.658a7.5 7.5 0 00-2.345-13.3L95.525 45.8l3.211-12.691a7.5 7.5 0 00-10.345-8.68l-11.94 5.365-5.699-11.786a7.5 7.5 0 00-3.487-3.487z\"/>\n        <circle cx=\"64\" cy=\"64\" r=\"22\" stroke-width=\"4\"/>\n    </g>\n</svg>";

    var _swirl = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <path fill=\"none\" stroke=\"#000\" stroke-width=\"4\" d=\"M60 116c28.719 0 52-23.281 52-52S88.719 12 60 12c-24.3 0-44 19.7-44 44s19.7 44 44 44c19.882 0 36-16.118 36-36S79.882 28 60 28c-15.464 0-28 12.536-28 28s12.536 28 28 28c11.046 0 20-8.954 20-20s-8.954-20-20-20c-6.627 0-12 5.373-12 12s5.373 12 12 12\"/>\n</svg>";

    var _stir = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <rect width=\"8\" height=\"88\" x=\"60\" y=\"4\" rx=\"4\"/>\n        <rect width=\"24\" height=\"40\" x=\"52\" y=\"84\" rx=\"12\"/>\n        <path fill-rule=\"nonzero\" d=\"M104.889 36.702a1.5 1.5 0 11-1.778 2.417C98.11 35.439 84.982 33.5 64 33.5c-14.87 0-28.889 1.98-39.54 5.307C15.09 41.734 9.5 45.446 9.5 48c0 2.561 5.418 6.15 14.673 8.96 10.52 3.194 24.575 5.08 39.827 5.08 14.415 0 27.498-2.215 39.255-6.64l-3.551-6.98 21.242-.147-12.628 17.083-3.696-7.266C92.435 62.725 78.892 65.04 64 65.04 32.84 65.04 6.5 57.04 6.5 48c0-9.045 27.068-17.5 57.5-17.5 21.638 0 35.177 2 40.889 6.202z\"/>\n    </g>\n</svg>";

    var _wait = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M64 8c30.928 0 56 25.072 56 56s-25.072 56-56 56S8 94.928 8 64 33.072 8 64 8zm0 8c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z\"/>\n        <rect width=\"8\" height=\"48\" x=\"60\" y=\"21\" rx=\"4\"/>\n        <rect width=\"32\" height=\"9\" x=\"60\" y=\"60\" rx=\"4.5\"/>\n    </g>\n</svg>";

    var _press = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <rect width=\"80\" height=\"8\" x=\"24\" y=\"24\" rx=\"4\"/>\n        <path d=\"M82 24a6 6 0 016 6v75c0 8.284-6.716 15-15 15H55c-8.284 0-15-6.716-15-15V30a6 6 0 016-6h36zm-8 8H54a6 6 0 00-6 6v66a8 8 0 008 8h16a8 8 0 008-8V38a6 6 0 00-6-6z\"/>\n        <path fill-rule=\"nonzero\" d=\"M66 8v69h8l-9.5 19L55 77h8V8h3z\"/>\n        <rect width=\"8\" height=\"64\" x=\"24\" y=\"56\" rx=\"4\"/>\n        <rect width=\"8\" height=\"64\" x=\"96\" y=\"56\" rx=\"4\"/>\n    </g>\n</svg>";

    const DEFAULT_GRIND = ['Espresso', 'Extra Fine', 'Fine', 'Medium Fine', 'Medium', 'Medium Coarse', 'Coarse'];

    function toMSS(time) {
      let total = parseInt(time, 10);
      let minutes = Math.floor(total / 60);
      let seconds = total - (minutes * 60);
      return minutes + ':' + ((seconds < 10) ? '0'+seconds : seconds);
    }

    function resolveSystemIcon(type) {
      switch (type) {
        case 'v_60':
        case 'v60':
          return v60;
        case 'moka':
          return moka;
        case 'aeropress':
          return aeropress;
      }
    }

    function resolveStepIcon(type) {
      // looks ugly but works faster
      switch (type) {
        case 'invert':
          return _invert;
        case 'lid':
          return _lid;
        case 'place':
          return _place;
        case 'pour':
          return _pour;
        case 'stir':
          return _stir;
        case 'wait':
          return _wait;
        case 'press':
          return _press;
        case 'heat':
        case 'cool':
        case 'brew':
          return _temp;
        case 'add':
          return _add;
        case 'swirl':
          return _swirl;
        case 'bloom':
          return _bloom;
        default:
          return _add // just coffee icon
      }
    }

    function getGrindLevel(level, translations) {
      if (Number.isInteger(level)){
        return (tt(translations, 'grind', DEFAULT_GRIND)[level-1]);
      }
      return tt(translations, 'grind', DEFAULT_GRIND)[5]; //medium
    }

    function stringToPath(path) {
      if (typeof path !== 'string') return path;
      const output = [];
      path.split('.').forEach(item => {
        item.split(/\[([^}]+)\]/g).forEach(key => {
          if (key.length > 0) {
            output.push(key);
          }
        });
      });
      return output;
    }
    function pathOr(obj, path, defaultVal) {
    	path = stringToPath(path);
    	let current = obj;
    	for (let i = 0; i < path.length; i++) {
    		if (!current[path[i]]) return defaultVal;
    		current = current[path[i]];
    	}
    	return current;
    }

    /* src/views/Home.svelte generated by Svelte v3.22.2 */
    const file = "src/views/Home.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (22:0) {#each systems as item}
    function create_each_block(ctx) {
    	let div2;
    	let a;
    	let div0;
    	let raw_value = /*item*/ ctx[5].icon + "";
    	let t0;
    	let div1;
    	let t1_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[5].name) + "";
    	let t1;
    	let a_href_value;
    	let a_title_value;
    	let t2;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			a = element("a");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			attr_dev(div0, "class", "system-icon svelte-16qklfr");
    			add_location(div0, file, 24, 6, 756);
    			attr_dev(div1, "class", "system-name svelte-16qklfr");
    			add_location(div1, file, 27, 6, 827);
    			attr_dev(a, "class", "system-button bh svelte-16qklfr");
    			attr_dev(a, "href", a_href_value = "#/" + /*item*/ ctx[5].url);
    			attr_dev(a, "title", a_title_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[5].name));
    			add_location(a, file, 23, 4, 664);
    			attr_dev(div2, "class", "item svelte-16qklfr");
    			add_location(div2, file, 22, 2, 641);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, a);
    			append_dev(a, div0);
    			div0.innerHTML = raw_value;
    			append_dev(a, t0);
    			append_dev(a, div1);
    			append_dev(div1, t1);
    			append_dev(div2, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 1 && t1_value !== (t1_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[5].name) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$translations*/ 1 && a_title_value !== (a_title_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[5].name))) {
    				attr_dev(a, "title", a_title_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(22:0) {#each systems as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let a0;
    	let t3;
    	let br0;
    	let t4;
    	let br1;
    	let t5;
    	let a1;
    	let t7;
    	let t8;
    	let div2;
    	let t9_value = /*$translations*/ ctx[0].language + "";
    	let t9;
    	let dispose;
    	let each_value = /*systems*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div1 = element("div");
    			t1 = text("Have your own recipe? Just propose it ");
    			a0 = element("a");
    			a0.textContent = "here";
    			t3 = text("!\n  ");
    			br0 = element("br");
    			t4 = text("\n  Want to contribute? ");
    			br1 = element("br");
    			t5 = text(" Welcome to the repository: ");
    			a1 = element("a");
    			a1.textContent = "github.com/2brew/2brew.github.io";
    			t7 = text(".");
    			t8 = space();
    			div2 = element("div");
    			t9 = text(t9_value);
    			add_location(div0, file, 20, 0, 609);
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "href", "https://github.com/2brew/2brew.github.io/issues");
    			attr_dev(a0, "class", "svelte-16qklfr");
    			add_location(a0, file, 34, 40, 989);
    			add_location(br0, file, 35, 2, 1075);
    			add_location(br1, file, 36, 22, 1102);
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "href", "https://github.com/2brew/2brew.github.io");
    			attr_dev(a1, "class", "svelte-16qklfr");
    			add_location(a1, file, 36, 54, 1134);
    			attr_dev(div1, "class", "author-info svelte-16qklfr");
    			add_location(div1, file, 33, 0, 923);
    			attr_dev(div2, "class", "lang bb svelte-16qklfr");
    			add_location(div2, file, 39, 0, 1247);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div0, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div0, null);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t1);
    			append_dev(div1, a0);
    			append_dev(div1, t3);
    			append_dev(div1, br0);
    			append_dev(div1, t4);
    			append_dev(div1, br1);
    			append_dev(div1, t5);
    			append_dev(div1, a1);
    			append_dev(div1, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, t9);
    			if (remount) dispose();
    			dispose = listen_dev(div2, "click", /*toggleLang*/ ctx[2], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*systems, tt, $translations*/ 3) {
    				each_value = /*systems*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$translations*/ 1 && t9_value !== (t9_value = /*$translations*/ ctx[0].language + "")) set_data_dev(t9, t9_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div2);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $translations;
    	validate_store(translations, "translations");
    	component_subscribe($$self, translations, $$value => $$invalidate(0, $translations = $$value));

    	const systems = [
    		{
    			name: "system.aeropress",
    			url: "aeropress",
    			icon: resolveSystemIcon("aeropress")
    		},
    		{
    			name: "system.v60",
    			url: "v_60",
    			icon: resolveSystemIcon("v_60")
    		},
    		{
    			name: "system.moka",
    			url: "moka",
    			icon: resolveSystemIcon("moka")
    		}
    	];

    	const languages = ["en", "ru", "pl"];
    	let nextLang = "ru";

    	function toggleLang() {
    		setLanguage(nextLang);
    		const index = languages.indexOf(nextLang);
    		nextLang = languages[index + 1] || "en";
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Home", $$slots, []);

    	$$self.$capture_state = () => ({
    		resolveSystemIcon,
    		translations,
    		tt,
    		setLanguage,
    		systems,
    		languages,
    		nextLang,
    		toggleLang,
    		$translations
    	});

    	$$self.$inject_state = $$props => {
    		if ("nextLang" in $$props) nextLang = $$props.nextLang;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [$translations, systems, toggleLang];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/components/Error.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$1, console: console_1$1 } = globals;
    const file$1 = "src/components/Error.svelte";

    // (13:4) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Error");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(13:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (11:4) {#if error.response}
    function create_if_block_1(ctx) {
    	let t0_value = /*error*/ ctx[0].response.status + "";
    	let t0;
    	let t1;
    	let t2_value = /*error*/ ctx[0].response.statusText + "";
    	let t2;

    	const block = {
    		c: function create() {
    			t0 = text(t0_value);
    			t1 = text(": ");
    			t2 = text(t2_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, t2, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 1 && t0_value !== (t0_value = /*error*/ ctx[0].response.status + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*error*/ 1 && t2_value !== (t2_value = /*error*/ ctx[0].response.statusText + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(t2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(11:4) {#if error.response}",
    		ctx
    	});

    	return block;
    }

    // (17:2) {#if error.message}
    function create_if_block$1(ctx) {
    	let p;

    	let t0_value = (/*error*/ ctx[0].name
    	? /*error*/ ctx[0].name + ": "
    	: "") + "";

    	let t0;
    	let t1_value = /*error*/ ctx[0].message + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(t1_value);
    			attr_dev(p, "class", "info svelte-bagxe1");
    			add_location(p, file$1, 17, 4, 318);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*error*/ 1 && t0_value !== (t0_value = (/*error*/ ctx[0].name
    			? /*error*/ ctx[0].name + ": "
    			: "") + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*error*/ 1 && t1_value !== (t1_value = /*error*/ ctx[0].message + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(17:2) {#if error.message}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let t1;

    	function select_block_type(ctx, dirty) {
    		if (/*error*/ ctx[0].response) return create_if_block_1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*error*/ ctx[0].message && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			t0 = text("⚠️\n    ");
    			if_block0.c();
    			t1 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(div0, "class", "heading svelte-bagxe1");
    			add_location(div0, file$1, 8, 2, 136);
    			attr_dev(div1, "class", "error svelte-bagxe1");
    			add_location(div1, file$1, 7, 0, 114);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, t0);
    			if_block0.m(div0, null);
    			append_dev(div1, t1);
    			if (if_block1) if_block1.m(div1, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div0, null);
    				}
    			}

    			if (/*error*/ ctx[0].message) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(div1, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { error } = $$props;
    	onMount(() => console.error(error));
    	const writable_props = ["error"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Error> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Error", $$slots, []);

    	$$self.$set = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    	};

    	$$self.$capture_state = () => ({ onMount, error });

    	$$self.$inject_state = $$props => {
    		if ("error" in $$props) $$invalidate(0, error = $$props.error);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [error];
    }

    class Error$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { error: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Error",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*error*/ ctx[0] === undefined && !("error" in props)) {
    			console_1$1.warn("<Error> was created without expected prop 'error'");
    		}
    	}

    	get error() {
    		throw new Error_1$1("<Error>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set error(value) {
    		throw new Error_1$1("<Error>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Back.svelte generated by Svelte v3.22.2 */
    const file$2 = "src/components/Back.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let a;
    	let t;
    	let link_action;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text("❮");
    			attr_dev(a, "class", "back-button bh svelte-11d0r1b");
    			attr_dev(a, "href", /*href*/ ctx[0]);
    			toggle_class(a, "no-margin", /*nomargin*/ ctx[1]);
    			add_location(a, file$2, 7, 2, 130);
    			attr_dev(div, "class", "back svelte-11d0r1b");
    			add_location(div, file$2, 6, 0, 109);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t);
    			if (remount) dispose();
    			dispose = action_destroyer(link_action = link.call(null, a));
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*href*/ 1) {
    				attr_dev(a, "href", /*href*/ ctx[0]);
    			}

    			if (dirty & /*nomargin*/ 2) {
    				toggle_class(a, "no-margin", /*nomargin*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { href } = $$props;
    	let { nomargin } = $$props;
    	const writable_props = ["href", "nomargin"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Back> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Back", $$slots, []);

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("nomargin" in $$props) $$invalidate(1, nomargin = $$props.nomargin);
    	};

    	$$self.$capture_state = () => ({ push, link, href, nomargin });

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("nomargin" in $$props) $$invalidate(1, nomargin = $$props.nomargin);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [href, nomargin];
    }

    class Back extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { href: 0, nomargin: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Back",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*href*/ ctx[0] === undefined && !("href" in props)) {
    			console.warn("<Back> was created without expected prop 'href'");
    		}

    		if (/*nomargin*/ ctx[1] === undefined && !("nomargin" in props)) {
    			console.warn("<Back> was created without expected prop 'nomargin'");
    		}
    	}

    	get href() {
    		throw new Error("<Back>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Back>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get nomargin() {
    		throw new Error("<Back>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set nomargin(value) {
    		throw new Error("<Back>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Loader.svelte generated by Svelte v3.22.2 */

    const file$3 = "src/components/Loader.svelte";

    function create_fragment$4(ctx) {
    	let div3;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = space();
    			div2 = element("div");
    			attr_dev(div0, "class", "bounce1 svelte-p3awft");
    			add_location(div0, file$3, 1, 2, 24);
    			attr_dev(div1, "class", "bounce2 svelte-p3awft");
    			add_location(div1, file$3, 2, 2, 54);
    			attr_dev(div2, "class", "bounce3 svelte-p3awft");
    			add_location(div2, file$3, 3, 2, 84);
    			attr_dev(div3, "class", "spinner svelte-p3awft");
    			add_location(div3, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div1);
    			append_dev(div3, t1);
    			append_dev(div3, div2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Loader> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Loader", $$slots, []);
    	return [];
    }

    class Loader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loader",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /**
     * Universal fetch wrapper
     * @param {String} endpoint
     * @param {Object} options
     *
     * @returns {Object}
     */
    async function requestEndpoint(endpoint, options={}) {
      try {
        const response = await window.fetch(endpoint, {
          headers: {'Content-Type': 'application/json'},
          ...options
        });
        const data = await response.json();
        if (response.ok) {
          return {data};
        } else {
          return {error: {...data, response}};
        }
      } catch (e) {
        return {error: e};
      }
    }

    /**
     * Simplest solution for store
     * @param {String} endpoint
     * @param {Object} options
     * @param {Object} store
     * @param {String} type
     */
    async function remote(endpoint, options={}, {set}, type) {
      set({[type]: null, error: null, isFetching: true});
      const result = await requestEndpoint(endpoint, options);
      if (result.error) {
        set({[type]: null, error: result.error, isFetching: false});
      } else {
        set({[type]: result.data, error: null, isFetching: false});
      }
      return result;
    }

    /**
     * Remote data template
     *
     * @returns {Object}
     */
    function createRemoteData() {
      return {
        aeropress: null,
        'v_60': null,
        moka: null,
        error: null,
        isFetching: true
      };
    }

    const recipes = writable(createRemoteData());

    const fetchRecipes = (type, reset) => {
      const actualRecipes = get_store_value(recipes);
      if (!reset && actualRecipes[type]) {
        return Promise.resolve();
      }
      return remote(`/public/${type}.json`, {}, recipes, type);
    };

    var time = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 72 72\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M36 0c19.882 0 36 16.118 36 36S55.882 72 36 72 0 55.882 0 36 16.118 0 36 0zm0 7C19.984 7 7 19.984 7 36s12.984 29 29 29 29-12.984 29-29S52.016 7 36 7z\"/>\n        <rect width=\"8\" height=\"32\" x=\"32\" y=\"8\" rx=\"4\"/>\n        <rect width=\"24\" height=\"8\" x=\"32\" y=\"32\" rx=\"4\"/>\n    </g>\n</svg>";

    var coffee = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 72 72\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M68.984 25.497c-.21 7.374-7.917 13.625-18.292 15.41-2.535-3.781-6.372-7.321-11.187-9.99a36.213 36.213 0 00-2.712-1.36l.268-.002c7.999-.14 10.24-3.054 15.937-3.778 3.795-.483 9.124-.576 15.986-.28zm.002-.5c.003.166.002.332-.002.496l.011.004c-5.373-2.24-10.726-3.313-16.059-3.22-7.998.14-10.24 3.055-15.936 3.779-3.452.439-8.173.555-14.161.35l-.67-.024a.2.2 0 00-.082.386l.096.038c-.376.034-.748.078-1.114.131a10.983 10.983 0 01-.075-1.102C20.839 17 31.458 9.65 44.71 9.42c13.253-.231 24.121 6.743 24.275 15.579z\"/>\n        <path d=\"M10.01 34.275c.08-.145.163-.288.25-.428l-.008-.01c3.533 4.627 7.632 8.233 12.297 10.819 6.997 3.878 10.395 2.474 15.69 4.695 3.21 1.347 7.356 3.606 12.44 6.777l.569.357a.2.2 0 00.263-.294c-.167-.21-.3-.375-.4-.495-3.27-3.954-6.996-7.09-11.174-9.406-6.997-3.878-10.395-2.474-15.691-4.696-3.529-1.48-8.19-4.063-13.985-7.75 4.52-7.335 17.123-8.232 28.496-1.928 11.593 6.426 17.518 17.901 13.234 25.63-4.284 7.728-17.155 8.784-28.747 2.358-11.593-6.426-17.518-17.9-13.234-25.63z\"/>\n    </g>\n</svg>";

    var grind = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 72 72\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <circle cx=\"28\" cy=\"13\" r=\"4\"/>\n        <circle cx=\"32\" cy=\"25\" r=\"4\"/>\n        <circle cx=\"46\" cy=\"17\" r=\"4\"/>\n        <circle cx=\"54\" cy=\"33\" r=\"4\"/>\n        <circle cx=\"36\" cy=\"47\" r=\"4\"/>\n        <circle cx=\"42\" cy=\"29\" r=\"4\"/>\n        <circle cx=\"46\" cy=\"41\" r=\"4\"/>\n        <circle cx=\"28\" cy=\"37\" r=\"4\"/>\n        <circle cx=\"54\" cy=\"53\" r=\"4\"/>\n        <circle cx=\"18\" cy=\"37\" r=\"4\"/>\n        <circle cx=\"22\" cy=\"49\" r=\"4\"/>\n        <circle cx=\"40\" cy=\"60\" r=\"4\"/>\n    </g>\n</svg>";

    /* src/views/Recipes.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$2 } = globals;
    const file$4 = "src/views/Recipes.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (26:0) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let each_value = /*$recipes*/ ctx[1][/*params*/ ctx[0].type];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "list");
    			add_location(div, file$4, 26, 0, 735);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*params, $recipes, getGrindLevel, $translations, grind, toMSS, time, tt, coffee, resolveSystemIcon*/ 7) {
    				each_value = /*$recipes*/ ctx[1][/*params*/ ctx[0].type];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(26:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (24:30) 
    function create_if_block_1$1(ctx) {
    	let current;
    	const loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(24:30) ",
    		ctx
    	});

    	return block;
    }

    // (22:0) {#if $recipes.error}
    function create_if_block$2(ctx) {
    	let current;

    	const error = new Error$1({
    			props: { error: /*$recipes*/ ctx[1].error },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(error.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(error, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const error_changes = {};
    			if (dirty & /*$recipes*/ 2) error_changes.error = /*$recipes*/ ctx[1].error;
    			error.$set(error_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(error.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(error.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(error, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(22:0) {#if $recipes.error}",
    		ctx
    	});

    	return block;
    }

    // (28:2) {#each $recipes[params.type] as recipe}
    function create_each_block$1(ctx) {
    	let a;
    	let div0;
    	let raw0_value = resolveSystemIcon(/*params*/ ctx[0].type) + "";
    	let t0;
    	let div8;
    	let div1;
    	let t1_value = /*recipe*/ ctx[3].title + "";
    	let t1;
    	let t2;
    	let div7;
    	let div2;
    	let t3_value = /*recipe*/ ctx[3].ingridients.water + "";
    	let t3;
    	let t4_value = tt(/*$translations*/ ctx[2], "global.ml") + "";
    	let t4;
    	let t5;
    	let i0;
    	let div3;
    	let t6_value = /*recipe*/ ctx[3].ingridients.coffee + "";
    	let t6;
    	let t7_value = tt(/*$translations*/ ctx[2], "global.g") + "";
    	let t7;
    	let t8;
    	let i1;
    	let div4;
    	let t9_value = toMSS(/*recipe*/ ctx[3].ingridients.time) + "";
    	let t9;
    	let t10;
    	let i2;
    	let div5;
    	let t11_value = getGrindLevel(/*recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[2]) + "";
    	let t11;
    	let t12;
    	let div6;
    	let t13_value = /*recipe*/ ctx[3].ingridients.temp + "";
    	let t13;
    	let t14;
    	let t15;
    	let a_href_value;
    	let link_action;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			div0 = element("div");
    			t0 = space();
    			div8 = element("div");
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div7 = element("div");
    			div2 = element("div");
    			t3 = text(t3_value);
    			t4 = text(t4_value);
    			t5 = space();
    			i0 = element("i");
    			div3 = element("div");
    			t6 = text(t6_value);
    			t7 = text(t7_value);
    			t8 = space();
    			i1 = element("i");
    			div4 = element("div");
    			t9 = text(t9_value);
    			t10 = space();
    			i2 = element("i");
    			div5 = element("div");
    			t11 = text(t11_value);
    			t12 = space();
    			div6 = element("div");
    			t13 = text(t13_value);
    			t14 = text("°");
    			t15 = space();
    			attr_dev(div0, "class", "recipe-icon svelte-vnbhl3");
    			toggle_class(div0, "inverted", /*recipe*/ ctx[3].ingridients.inverted);
    			add_location(div0, file$4, 29, 6, 880);
    			attr_dev(div1, "class", "recipe-name svelte-vnbhl3");
    			add_location(div1, file$4, 33, 10, 1053);
    			attr_dev(div2, "class", "ingridient-data svelte-vnbhl3");
    			add_location(div2, file$4, 35, 10, 1152);
    			attr_dev(i0, "class", "svelte-vnbhl3");
    			add_location(i0, file$4, 36, 12, 1258);
    			attr_dev(div3, "class", "ingridient-data svelte-vnbhl3");
    			add_location(div3, file$4, 36, 33, 1279);
    			attr_dev(i1, "class", "svelte-vnbhl3");
    			add_location(i1, file$4, 37, 12, 1385);
    			attr_dev(div4, "class", "ingridient-data svelte-vnbhl3");
    			add_location(div4, file$4, 37, 31, 1404);
    			attr_dev(i2, "class", "svelte-vnbhl3");
    			add_location(i2, file$4, 38, 12, 1484);
    			attr_dev(div5, "class", "ingridient-data svelte-vnbhl3");
    			add_location(div5, file$4, 38, 32, 1504);
    			attr_dev(div6, "class", "ingridient-data svelte-vnbhl3");
    			add_location(div6, file$4, 39, 12, 1608);
    			attr_dev(div7, "class", "recipe-ingridients svelte-vnbhl3");
    			add_location(div7, file$4, 34, 10, 1109);
    			attr_dev(div8, "class", "recipe-data svelte-vnbhl3");
    			add_location(div8, file$4, 32, 6, 1017);
    			attr_dev(a, "class", "recipe-button bh svelte-vnbhl3");
    			attr_dev(a, "href", a_href_value = "/" + /*params*/ ctx[0].type + "/" + /*recipe*/ ctx[3].name);
    			add_location(a, file$4, 28, 4, 800);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, a, anchor);
    			append_dev(a, div0);
    			div0.innerHTML = raw0_value;
    			append_dev(a, t0);
    			append_dev(a, div8);
    			append_dev(div8, div1);
    			append_dev(div1, t1);
    			append_dev(div8, t2);
    			append_dev(div8, div7);
    			append_dev(div7, div2);
    			append_dev(div2, t3);
    			append_dev(div2, t4);
    			append_dev(div7, t5);
    			append_dev(div7, i0);
    			i0.innerHTML = coffee;
    			append_dev(div7, div3);
    			append_dev(div3, t6);
    			append_dev(div3, t7);
    			append_dev(div7, t8);
    			append_dev(div7, i1);
    			i1.innerHTML = time;
    			append_dev(div7, div4);
    			append_dev(div4, t9);
    			append_dev(div7, t10);
    			append_dev(div7, i2);
    			i2.innerHTML = grind;
    			append_dev(div7, div5);
    			append_dev(div5, t11);
    			append_dev(div7, t12);
    			append_dev(div7, div6);
    			append_dev(div6, t13);
    			append_dev(div6, t14);
    			append_dev(a, t15);
    			if (remount) dispose();
    			dispose = action_destroyer(link_action = link.call(null, a));
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*params*/ 1 && raw0_value !== (raw0_value = resolveSystemIcon(/*params*/ ctx[0].type) + "")) div0.innerHTML = raw0_value;
    			if (dirty & /*$recipes, params*/ 3) {
    				toggle_class(div0, "inverted", /*recipe*/ ctx[3].ingridients.inverted);
    			}

    			if (dirty & /*$recipes, params*/ 3 && t1_value !== (t1_value = /*recipe*/ ctx[3].title + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$recipes, params*/ 3 && t3_value !== (t3_value = /*recipe*/ ctx[3].ingridients.water + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$translations*/ 4 && t4_value !== (t4_value = tt(/*$translations*/ ctx[2], "global.ml") + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*$recipes, params*/ 3 && t6_value !== (t6_value = /*recipe*/ ctx[3].ingridients.coffee + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*$translations*/ 4 && t7_value !== (t7_value = tt(/*$translations*/ ctx[2], "global.g") + "")) set_data_dev(t7, t7_value);
    			if (dirty & /*$recipes, params*/ 3 && t9_value !== (t9_value = toMSS(/*recipe*/ ctx[3].ingridients.time) + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*$recipes, params, $translations*/ 7 && t11_value !== (t11_value = getGrindLevel(/*recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[2]) + "")) set_data_dev(t11, t11_value);
    			if (dirty & /*$recipes, params*/ 3 && t13_value !== (t13_value = /*recipe*/ ctx[3].ingridients.temp + "")) set_data_dev(t13, t13_value);

    			if (dirty & /*params, $recipes*/ 3 && a_href_value !== (a_href_value = "/" + /*params*/ ctx[0].type + "/" + /*recipe*/ ctx[3].name)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(28:2) {#each $recipes[params.type] as recipe}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const back = new Back({ props: { href: "/" }, $$inline: true });
    	const if_block_creators = [create_if_block$2, create_if_block_1$1, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$recipes*/ ctx[1].error) return 0;
    		if (/*$recipes*/ ctx[1].isFetching) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			create_component(back.$$.fragment);
    			t = space();
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1$2("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(back, target, anchor);
    			insert_dev(target, t, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(back.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(back.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(back, detaching);
    			if (detaching) detach_dev(t);
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $recipes;
    	let $translations;
    	validate_store(recipes, "recipes");
    	component_subscribe($$self, recipes, $$value => $$invalidate(1, $recipes = $$value));
    	validate_store(translations, "translations");
    	component_subscribe($$self, translations, $$value => $$invalidate(2, $translations = $$value));
    	let { params = {} } = $$props;
    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Recipes> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Recipes", $$slots, []);

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		link,
    		Error: Error$1,
    		Back,
    		Loader,
    		toMSS,
    		resolveSystemIcon,
    		getGrindLevel,
    		fetchRecipes,
    		recipes,
    		tt,
    		translations,
    		time,
    		coffee,
    		grind,
    		params,
    		$recipes,
    		$translations
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*params*/ 1) {
    			 {
    				fetchRecipes(params.type);
    			}
    		}
    	};

    	return [params, $recipes, $translations];
    }

    class Recipes extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recipes",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get params() {
    		throw new Error_1$2("<Recipes>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error_1$2("<Recipes>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function scale(node, { delay = 0, duration = 400, easing = cubicOut, start = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const sd = 1 - start;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (_t, u) => `
			transform: ${transform} scale(${1 - (sd * u)});
			opacity: ${target_opacity - (od * u)}
		`
        };
    }

    var media = {
      webm:
        "data:video/webm;base64,GkXfo0AgQoaBAUL3gQFC8oEEQvOBCEKCQAR3ZWJtQoeBAkKFgQIYU4BnQI0VSalmQCgq17FAAw9CQE2AQAZ3aGFtbXlXQUAGd2hhbW15RIlACECPQAAAAAAAFlSua0AxrkAu14EBY8WBAZyBACK1nEADdW5khkAFVl9WUDglhohAA1ZQOIOBAeBABrCBCLqBCB9DtnVAIueBAKNAHIEAAIAwAQCdASoIAAgAAUAmJaQAA3AA/vz0AAA=",
      mp4:
        "data:video/mp4;base64,AAAAIGZ0eXBtcDQyAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAACKBtZGF0AAAC8wYF///v3EXpvebZSLeWLNgg2SPu73gyNjQgLSBjb3JlIDE0MiByMjQ3OSBkZDc5YTYxIC0gSC4yNjQvTVBFRy00IEFWQyBjb2RlYyAtIENvcHlsZWZ0IDIwMDMtMjAxNCAtIGh0dHA6Ly93d3cudmlkZW9sYW4ub3JnL3gyNjQuaHRtbCAtIG9wdGlvbnM6IGNhYmFjPTEgcmVmPTEgZGVibG9jaz0xOjA6MCBhbmFseXNlPTB4MToweDExMSBtZT1oZXggc3VibWU9MiBwc3k9MSBwc3lfcmQ9MS4wMDowLjAwIG1peGVkX3JlZj0wIG1lX3JhbmdlPTE2IGNocm9tYV9tZT0xIHRyZWxsaXM9MCA4eDhkY3Q9MCBjcW09MCBkZWFkem9uZT0yMSwxMSBmYXN0X3Bza2lwPTEgY2hyb21hX3FwX29mZnNldD0wIHRocmVhZHM9NiBsb29rYWhlYWRfdGhyZWFkcz0xIHNsaWNlZF90aHJlYWRzPTAgbnI9MCBkZWNpbWF0ZT0xIGludGVybGFjZWQ9MCBibHVyYXlfY29tcGF0PTAgY29uc3RyYWluZWRfaW50cmE9MCBiZnJhbWVzPTMgYl9weXJhbWlkPTIgYl9hZGFwdD0xIGJfYmlhcz0wIGRpcmVjdD0xIHdlaWdodGI9MSBvcGVuX2dvcD0wIHdlaWdodHA9MSBrZXlpbnQ9MzAwIGtleWludF9taW49MzAgc2NlbmVjdXQ9NDAgaW50cmFfcmVmcmVzaD0wIHJjX2xvb2thaGVhZD0xMCByYz1jcmYgbWJ0cmVlPTEgY3JmPTIwLjAgcWNvbXA9MC42MCBxcG1pbj0wIHFwbWF4PTY5IHFwc3RlcD00IHZidl9tYXhyYXRlPTIwMDAwIHZidl9idWZzaXplPTI1MDAwIGNyZl9tYXg9MC4wIG5hbF9ocmQ9bm9uZSBmaWxsZXI9MCBpcF9yYXRpbz0xLjQwIGFxPTE6MS4wMACAAAAAOWWIhAA3//p+C7v8tDDSTjf97w55i3SbRPO4ZY+hkjD5hbkAkL3zpJ6h/LR1CAABzgB1kqqzUorlhQAAAAxBmiQYhn/+qZYADLgAAAAJQZ5CQhX/AAj5IQADQGgcIQADQGgcAAAACQGeYUQn/wALKCEAA0BoHAAAAAkBnmNEJ/8ACykhAANAaBwhAANAaBwAAAANQZpoNExDP/6plgAMuSEAA0BoHAAAAAtBnoZFESwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBnqVEJ/8ACykhAANAaBwAAAAJAZ6nRCf/AAsoIQADQGgcIQADQGgcAAAADUGarDRMQz/+qZYADLghAANAaBwAAAALQZ7KRRUsK/8ACPkhAANAaBwAAAAJAZ7pRCf/AAsoIQADQGgcIQADQGgcAAAACQGe60Qn/wALKCEAA0BoHAAAAA1BmvA0TEM//qmWAAy5IQADQGgcIQADQGgcAAAAC0GfDkUVLCv/AAj5IQADQGgcAAAACQGfLUQn/wALKSEAA0BoHCEAA0BoHAAAAAkBny9EJ/8ACyghAANAaBwAAAANQZs0NExDP/6plgAMuCEAA0BoHAAAAAtBn1JFFSwr/wAI+SEAA0BoHCEAA0BoHAAAAAkBn3FEJ/8ACyghAANAaBwAAAAJAZ9zRCf/AAsoIQADQGgcIQADQGgcAAAADUGbeDRMQz/+qZYADLkhAANAaBwAAAALQZ+WRRUsK/8ACPghAANAaBwhAANAaBwAAAAJAZ+1RCf/AAspIQADQGgcAAAACQGft0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bm7w0TEM//qmWAAy4IQADQGgcAAAAC0Gf2kUVLCv/AAj5IQADQGgcAAAACQGf+UQn/wALKCEAA0BoHCEAA0BoHAAAAAkBn/tEJ/8ACykhAANAaBwAAAANQZvgNExDP/6plgAMuSEAA0BoHCEAA0BoHAAAAAtBnh5FFSwr/wAI+CEAA0BoHAAAAAkBnj1EJ/8ACyghAANAaBwhAANAaBwAAAAJAZ4/RCf/AAspIQADQGgcAAAADUGaJDRMQz/+qZYADLghAANAaBwAAAALQZ5CRRUsK/8ACPkhAANAaBwhAANAaBwAAAAJAZ5hRCf/AAsoIQADQGgcAAAACQGeY0Qn/wALKSEAA0BoHCEAA0BoHAAAAA1Bmmg0TEM//qmWAAy5IQADQGgcAAAAC0GehkUVLCv/AAj5IQADQGgcIQADQGgcAAAACQGepUQn/wALKSEAA0BoHAAAAAkBnqdEJ/8ACyghAANAaBwAAAANQZqsNExDP/6plgAMuCEAA0BoHCEAA0BoHAAAAAtBnspFFSwr/wAI+SEAA0BoHAAAAAkBnulEJ/8ACyghAANAaBwhAANAaBwAAAAJAZ7rRCf/AAsoIQADQGgcAAAADUGa8DRMQz/+qZYADLkhAANAaBwhAANAaBwAAAALQZ8ORRUsK/8ACPkhAANAaBwAAAAJAZ8tRCf/AAspIQADQGgcIQADQGgcAAAACQGfL0Qn/wALKCEAA0BoHAAAAA1BmzQ0TEM//qmWAAy4IQADQGgcAAAAC0GfUkUVLCv/AAj5IQADQGgcIQADQGgcAAAACQGfcUQn/wALKCEAA0BoHAAAAAkBn3NEJ/8ACyghAANAaBwhAANAaBwAAAANQZt4NExC//6plgAMuSEAA0BoHAAAAAtBn5ZFFSwr/wAI+CEAA0BoHCEAA0BoHAAAAAkBn7VEJ/8ACykhAANAaBwAAAAJAZ+3RCf/AAspIQADQGgcAAAADUGbuzRMQn/+nhAAYsAhAANAaBwhAANAaBwAAAAJQZ/aQhP/AAspIQADQGgcAAAACQGf+UQn/wALKCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHCEAA0BoHAAACiFtb292AAAAbG12aGQAAAAA1YCCX9WAgl8AAAPoAAAH/AABAAABAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAGGlvZHMAAAAAEICAgAcAT////v7/AAAF+XRyYWsAAABcdGtoZAAAAAPVgIJf1YCCXwAAAAEAAAAAAAAH0AAAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAEAAAAAAygAAAMoAAAAAACRlZHRzAAAAHGVsc3QAAAAAAAAAAQAAB9AAABdwAAEAAAAABXFtZGlhAAAAIG1kaGQAAAAA1YCCX9WAgl8AAV+QAAK/IFXEAAAAAAAtaGRscgAAAAAAAAAAdmlkZQAAAAAAAAAAAAAAAFZpZGVvSGFuZGxlcgAAAAUcbWluZgAAABR2bWhkAAAAAQAAAAAAAAAAAAAAJGRpbmYAAAAcZHJlZgAAAAAAAAABAAAADHVybCAAAAABAAAE3HN0YmwAAACYc3RzZAAAAAAAAAABAAAAiGF2YzEAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAygDKAEgAAABIAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY//8AAAAyYXZjQwFNQCj/4QAbZ01AKOyho3ySTUBAQFAAAAMAEAAr8gDxgxlgAQAEaO+G8gAAABhzdHRzAAAAAAAAAAEAAAA8AAALuAAAABRzdHNzAAAAAAAAAAEAAAABAAAB8GN0dHMAAAAAAAAAPAAAAAEAABdwAAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAADqYAAAAAQAAF3AAAAABAAAAAAAAAAEAAAu4AAAAAQAAOpgAAAABAAAXcAAAAAEAAAAAAAAAAQAAC7gAAAABAAA6mAAAAAEAABdwAAAAAQAAAAAAAAABAAALuAAAAAEAAC7gAAAAAQAAF3AAAAABAAAAAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAEEc3RzegAAAAAAAAAAAAAAPAAAAzQAAAAQAAAADQAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAAPAAAADQAAAA0AAAARAAAADwAAAA0AAAANAAAAEQAAAA8AAAANAAAADQAAABEAAAANAAAADQAAAQBzdGNvAAAAAAAAADwAAAAwAAADZAAAA3QAAAONAAADoAAAA7kAAAPQAAAD6wAAA/4AAAQXAAAELgAABEMAAARcAAAEbwAABIwAAAShAAAEugAABM0AAATkAAAE/wAABRIAAAUrAAAFQgAABV0AAAVwAAAFiQAABaAAAAW1AAAFzgAABeEAAAX+AAAGEwAABiwAAAY/AAAGVgAABnEAAAaEAAAGnQAABrQAAAbPAAAG4gAABvUAAAcSAAAHJwAAB0AAAAdTAAAHcAAAB4UAAAeeAAAHsQAAB8gAAAfjAAAH9gAACA8AAAgmAAAIQQAACFQAAAhnAAAIhAAACJcAAAMsdHJhawAAAFx0a2hkAAAAA9WAgl/VgIJfAAAAAgAAAAAAAAf8AAAAAAAAAAAAAAABAQAAAAABAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAACsm1kaWEAAAAgbWRoZAAAAADVgIJf1YCCXwAArEQAAWAAVcQAAAAAACdoZGxyAAAAAAAAAABzb3VuAAAAAAAAAAAAAAAAU3RlcmVvAAAAAmNtaW5mAAAAEHNtaGQAAAAAAAAAAAAAACRkaW5mAAAAHGRyZWYAAAAAAAAAAQAAAAx1cmwgAAAAAQAAAidzdGJsAAAAZ3N0c2QAAAAAAAAAAQAAAFdtcDRhAAAAAAAAAAEAAAAAAAAAAAACABAAAAAArEQAAAAAADNlc2RzAAAAAAOAgIAiAAIABICAgBRAFQAAAAADDUAAAAAABYCAgAISEAaAgIABAgAAABhzdHRzAAAAAAAAAAEAAABYAAAEAAAAABxzdHNjAAAAAAAAAAEAAAABAAAAAQAAAAEAAAAUc3RzegAAAAAAAAAGAAAAWAAAAXBzdGNvAAAAAAAAAFgAAAOBAAADhwAAA5oAAAOtAAADswAAA8oAAAPfAAAD5QAAA/gAAAQLAAAEEQAABCgAAAQ9AAAEUAAABFYAAARpAAAEgAAABIYAAASbAAAErgAABLQAAATHAAAE3gAABPMAAAT5AAAFDAAABR8AAAUlAAAFPAAABVEAAAVXAAAFagAABX0AAAWDAAAFmgAABa8AAAXCAAAFyAAABdsAAAXyAAAF+AAABg0AAAYgAAAGJgAABjkAAAZQAAAGZQAABmsAAAZ+AAAGkQAABpcAAAauAAAGwwAABskAAAbcAAAG7wAABwYAAAcMAAAHIQAABzQAAAc6AAAHTQAAB2QAAAdqAAAHfwAAB5IAAAeYAAAHqwAAB8IAAAfXAAAH3QAAB/AAAAgDAAAICQAACCAAAAg1AAAIOwAACE4AAAhhAAAIeAAACH4AAAiRAAAIpAAACKoAAAiwAAAItgAACLwAAAjCAAAAFnVkdGEAAAAObmFtZVN0ZXJlbwAAAHB1ZHRhAAAAaG1ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAG1kaXJhcHBsAAAAAAAAAAAAAAAAO2lsc3QAAAAzqXRvbwAAACtkYXRhAAAAAQAAAABIYW5kQnJha2UgMC4xMC4yIDIwMTUwNjExMDA=",
    };

    const { webm, mp4 } = media;

    // Detect iOS browsers < version 10
    const oldIOS =
      typeof navigator !== "undefined" &&
      parseFloat(
        (
          "" +
          (/CPU.*OS ([0-9_]{3,4})[0-9_]{0,1}|(CPU like).*AppleWebKit.*Mobile/i.exec(
            navigator.userAgent
          ) || [0, ""])[1]
        )
          .replace("undefined", "3_2")
          .replace("_", ".")
          .replace("_", "")
      ) < 10 &&
      !window.MSStream;

    // Detect native Wake Lock API support
    const nativeWakeLock = "wakeLock" in navigator;

    class NoSleep {
      constructor() {
        if (nativeWakeLock) {
          this._wakeLock = null;
          const handleVisibilityChange = () => {
            if (this._wakeLock !== null && document.visibilityState === "visible") {
              this.enable();
            }
          };
          document.addEventListener("visibilitychange", handleVisibilityChange);
          document.addEventListener("fullscreenchange", handleVisibilityChange);
        } else if (oldIOS) {
          this.noSleepTimer = null;
        } else {
          // Set up no sleep video element
          this.noSleepVideo = document.createElement("video");

          this.noSleepVideo.setAttribute("title", "No Sleep");
          this.noSleepVideo.setAttribute("playsinline", "");

          this._addSourceToVideo(this.noSleepVideo, "webm", webm);
          this._addSourceToVideo(this.noSleepVideo, "mp4", mp4);

          this.noSleepVideo.addEventListener("loadedmetadata", () => {
            if (this.noSleepVideo.duration <= 1) {
              // webm source
              this.noSleepVideo.setAttribute("loop", "");
            } else {
              // mp4 source
              this.noSleepVideo.addEventListener("timeupdate", () => {
                if (this.noSleepVideo.currentTime > 0.5) {
                  this.noSleepVideo.currentTime = Math.random();
                }
              });
            }
          });
        }
      }

      _addSourceToVideo(element, type, dataURI) {
        var source = document.createElement("source");
        source.src = dataURI;
        source.type = `video/${type}`;
        element.appendChild(source);
      }

      enable() {
        if (nativeWakeLock) {
          navigator.wakeLock
            .request("screen")
            .then((wakeLock) => {
              this._wakeLock = wakeLock;
              console.log("Wake Lock active.");
              this._wakeLock.addEventListener("release", () => {
                // ToDo: Potentially emit an event for the page to observe since
                // Wake Lock releases happen when page visibility changes.
                // (https://web.dev/wakelock/#wake-lock-lifecycle)
                console.log("Wake Lock released.");
              });
            })
            .catch((err) => {
              console.error(`${err.name}, ${err.message}`);
            });
        } else if (oldIOS) {
          this.disable();
          console.warn(`
        NoSleep enabled for older iOS devices. This can interrupt
        active or long-running network requests from completing successfully.
        See https://github.com/richtr/NoSleep.js/issues/15 for more details.
      `);
          this.noSleepTimer = window.setInterval(() => {
            if (!document.hidden) {
              window.location.href = window.location.href.split("#")[0];
              window.setTimeout(window.stop, 0);
            }
          }, 15000);
        } else {
          this.noSleepVideo.play();
        }
      }

      disable() {
        if (nativeWakeLock) {
          this._wakeLock.release();
          this._wakeLock = null;
        } else if (oldIOS) {
          if (this.noSleepTimer) {
            console.warn(`
          NoSleep now disabled for older iOS devices.
        `);
            window.clearInterval(this.noSleepTimer);
            this.noSleepTimer = null;
          }
        } else {
          this.noSleepVideo.pause();
        }
      }
    }

    var src = NoSleep;

    const noSleep = new src();
    let interval;

    const stage = new Audio('/public/audio/stage.wav');
    const end = new Audio('/public/audio/end.wav');

    const recipe = writable({
      title: null,
      notes: null,
      steps: [],
      ingridients: {},
      error: null,
      isFetching: false
    });

    const timer = writable({
      time: null,
      step: null,
      water: 0
    });

    function calculateWater(current, stepNumber) {
      return current.steps.reduce((acc, step, index) => {
        if (step.type === 'pour' && index < stepNumber) {
          return acc + step.amount;
        }
        return acc;
      }, 0)
    }

    const clearRecipe = () => {
      recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
    };

    const fetchCurrentRecipe = async (type, name) => {
      let currentRecipe = null;
      recipe.set({title: null, notes: null, steps: [], ingridients: {}, error: null, isFetching: true});
      await fetchRecipes(type);
      currentRecipe = get_store_value(recipes)[type] ? get_store_value(recipes)[type].find((item) => item.name === name) : null;
      if (currentRecipe) {
        recipe.set({title: currentRecipe.title, notes: currentRecipe.notes, steps: currentRecipe.steps, ingridients: currentRecipe.ingridients, error: null, isFetching: false});
      } else {
        recipe.set({steps: [], ingridients: {}, error: {response: {status: 404, statusText: 'Not Found'}}, isFetching: false});
      }
    };

    const startTimer = (initialStep = 0, time) => {
      clearInterval(interval);
      const current = get_store_value(recipe);
      const stepNumber = initialStep;
      const tick = new Audio('/public/audio/tick.wav');
      const tock = new Audio('/public/audio/tick.wav');

      if (current.steps.length && current.steps[stepNumber]) {
        timer.set({
          time: time === undefined ? current.steps[stepNumber].time : time, 
          water: time === undefined ? calculateWater(current, stepNumber) : get_store_value(timer).water,
          step: stepNumber
        });
        interval = setInterval(() => {
          const ct = get_store_value(timer);
          let nextTime = ct.time;
          let water = ct.water;
          if (nextTime > 0) {
            nextTime = nextTime - 1;
            if (nextTime <= 3) {
              // to avoid the situation when sound isn't play because it's still not ended
              (nextTime % 2 == 0) ? tick.play() : tock.play();
            }
            const currentStep = current.steps[ct.step];
            if (currentStep.type === 'pour') { // show water level
              water = ct.water + currentStep.amount/(currentStep.time);
            }
            timer.set({time: nextTime, water, step: ct.step});
            return;
          }
          if (ct.step >= current.steps.length - 1) {
            clearInterval(interval);
            timer.set({time: null, step: null, water, done: true});
            noSleep.disable();
            end.play();
          } else {
            timer.set({time: current.steps[ct.step+1].time, water, step: ct.step+1});
            stage.play();
          }
        }, 1000);
      } else {
        stopTimer();
      }
    };

    const stopTimer = () => {
      clearInterval(interval);
      timer.set({time: null, water: 0, step: null});
      noSleep.disable();
    };

    const destroyTimer = () => {
      stopTimer();
      interval = null;
      clearRecipe();
    };

    const pauseTimer = () => {
      clearInterval(interval);
      noSleep.disable();
      return get_store_value(timer).time;
    };

    const nextStep = () => {
      const ct = get_store_value(timer);
      startTimer(ct.step+1);
    };

    var water = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 72 72\">\n    <path fill-rule=\"evenodd\" d=\"M36.72 12C48.04 27.568 53.07 40.047 51.811 49.437c-1.886 14.084-26.41 14.084-30.182 0C19.114 40.047 24.144 27.568 36.72 12z\"/>\n</svg>";

    var play = "<svg xmlns=\"http://www.w3.org/2000/svg\"viewBox=\"0 0 128 128\">\n    <path fill-rule=\"evenodd\" d=\"M117.267 69.367l-76.584 38.291A6 6 0 0132 102.292V25.708a6 6 0 018.683-5.366l76.584 38.291a6 6 0 010 10.734z\"/>\n</svg>";

    var stop = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <rect width=\"96\" height=\"96\" x=\"16\" y=\"16\" fill-rule=\"evenodd\" rx=\"8\"/>\n</svg>";

    var next = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <path d=\"M73.267 69.367L28.683 91.658A6 6 0 0120 86.292V41.708a6 6 0 018.683-5.366l44.584 22.291a6 6 0 010 10.734z\"/>\n        <path d=\"M113.267 69.367L68.683 91.658A6 6 0 0160 86.292V41.708a6 6 0 018.683-5.366l44.584 22.291a6 6 0 010 10.734z\"/>\n    </g>\n</svg>";

    var pause = "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 128 128\">\n    <g fill=\"#000\" fill-rule=\"evenodd\">\n        <rect width=\"24\" height=\"95\" x=\"32\" y=\"16\" rx=\"8\"/>\n        <rect width=\"24\" height=\"95\" x=\"72\" y=\"16\" rx=\"8\"/>\n    </g>\n</svg>";

    /* src/views/Timer.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$3 } = globals;
    const file$5 = "src/views/Timer.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (74:37) 
    function create_if_block_2(ctx) {
    	let div5;
    	let div0;
    	let i0;
    	let t0_value = /*$recipe*/ ctx[3].ingridients.coffee + "";
    	let t0;
    	let t1_value = tt(/*$translations*/ ctx[4], "global.g") + "";
    	let t1;
    	let t2;
    	let div1;
    	let i1;
    	let t3_value = /*$recipe*/ ctx[3].ingridients.water + "";
    	let t3;
    	let t4_value = tt(/*$translations*/ ctx[4], "global.ml") + "";
    	let t4;
    	let t5;
    	let div2;
    	let i2;
    	let span;
    	let t6_value = getGrindLevel(/*$recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[4]) + "";
    	let t6;
    	let t7;
    	let div3;
    	let t8_value = /*$recipe*/ ctx[3].ingridients.temp + "";
    	let t8;
    	let t9;
    	let t10;
    	let div4;
    	let i3;
    	let t11_value = toMSS(/*$recipe*/ ctx[3].ingridients.time) + "";
    	let t11;
    	let t12;
    	let t13;
    	let h1;
    	let t14_value = /*$recipe*/ ctx[3].title + "";
    	let t14;
    	let t15;
    	let t16;
    	let div9;
    	let t17;
    	let t18;
    	let div6;
    	let t19_value = parseInt(/*$timer*/ ctx[2].water) + "";
    	let t19;
    	let t20_value = tt(/*$translations*/ ctx[4], "global.ml") + "";
    	let t20;
    	let t21;
    	let div8;
    	let t22;
    	let div7;
    	let t23;
    	let t24;
    	let div10;
    	let dispose;
    	let if_block0 = /*$recipe*/ ctx[3].ingridients.inverted && create_if_block_16(ctx);
    	let if_block1 = /*$recipe*/ ctx[3].notes && create_if_block_15(ctx);
    	let if_block2 = /*$timer*/ ctx[2].step !== null && /*$timer*/ ctx[2].step < /*$recipe*/ ctx[3].steps.length - 1 && create_if_block_14(ctx);
    	let if_block3 = /*$timer*/ ctx[2].step !== null && create_if_block_13(ctx);
    	let if_block4 = /*$timer*/ ctx[2].step !== null && create_if_block_10(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$timer*/ ctx[2].time) return create_if_block_7;
    		if (/*$timer*/ ctx[2].done) return create_if_block_8;
    		if (/*$timer*/ ctx[2].time === 0) return create_if_block_9;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block5 = current_block_type(ctx);
    	let if_block6 = /*$timer*/ ctx[2].step !== null && /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].type === "pour" && create_if_block_6(ctx);
    	let each_value = /*$recipe*/ ctx[3].steps;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			div0 = element("div");
    			i0 = element("i");
    			t0 = text(t0_value);
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			i1 = element("i");
    			t3 = text(t3_value);
    			t4 = text(t4_value);
    			t5 = space();
    			div2 = element("div");
    			i2 = element("i");
    			span = element("span");
    			t6 = text(t6_value);
    			t7 = space();
    			div3 = element("div");
    			t8 = text(t8_value);
    			t9 = text("°");
    			t10 = space();
    			div4 = element("div");
    			i3 = element("i");
    			t11 = text(t11_value);
    			t12 = space();
    			if (if_block0) if_block0.c();
    			t13 = space();
    			h1 = element("h1");
    			t14 = text(t14_value);
    			t15 = space();
    			if (if_block1) if_block1.c();
    			t16 = space();
    			div9 = element("div");
    			if (if_block2) if_block2.c();
    			t17 = space();
    			if (if_block3) if_block3.c();
    			t18 = space();
    			div6 = element("div");
    			t19 = text(t19_value);
    			t20 = text(t20_value);
    			t21 = space();
    			div8 = element("div");
    			if (if_block4) if_block4.c();
    			t22 = space();
    			div7 = element("div");
    			if_block5.c();
    			t23 = space();
    			if (if_block6) if_block6.c();
    			t24 = space();
    			div10 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(i0, "class", "svelte-gytla1");
    			add_location(i0, file$5, 75, 42, 1899);
    			attr_dev(div0, "class", "recipe-pad recipe-coffee svelte-gytla1");
    			add_location(div0, file$5, 75, 4, 1861);
    			attr_dev(i1, "class", "svelte-gytla1");
    			add_location(i1, file$5, 76, 41, 2027);
    			attr_dev(div1, "class", "recipe-pad recipe-water svelte-gytla1");
    			add_location(div1, file$5, 76, 4, 1990);
    			attr_dev(i2, "class", "svelte-gytla1");
    			add_location(i2, file$5, 77, 41, 2154);
    			add_location(span, file$5, 77, 61, 2174);
    			attr_dev(div2, "class", "recipe-pad recipe-grind svelte-gytla1");
    			add_location(div2, file$5, 77, 4, 2117);
    			attr_dev(div3, "class", "recipe-pad recipe-temp svelte-gytla1");
    			add_location(div3, file$5, 78, 4, 2255);
    			attr_dev(i3, "class", "svelte-gytla1");
    			add_location(i3, file$5, 79, 40, 2365);
    			attr_dev(div4, "class", "recipe-pad recipe-time svelte-gytla1");
    			add_location(div4, file$5, 79, 4, 2329);
    			attr_dev(div5, "class", "recipe-info svelte-gytla1");
    			add_location(div5, file$5, 74, 2, 1831);
    			attr_dev(h1, "class", "recipe-title svelte-gytla1");
    			add_location(h1, file$5, 84, 2, 2575);
    			attr_dev(div6, "class", "actions timer-water svelte-gytla1");
    			add_location(div6, file$5, 103, 4, 3124);
    			attr_dev(div7, "class", "timer-content svelte-gytla1");
    			add_location(div7, file$5, 129, 6, 4206);
    			attr_dev(div8, "class", "timer svelte-gytla1");
    			add_location(div8, file$5, 106, 4, 3240);
    			attr_dev(div9, "class", "timer-wrapper svelte-gytla1");
    			add_location(div9, file$5, 92, 2, 2725);
    			attr_dev(div10, "class", "steps svelte-gytla1");
    			add_location(div10, file$5, 149, 2, 4869);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, div0);
    			append_dev(div0, i0);
    			i0.innerHTML = coffee;
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div5, t2);
    			append_dev(div5, div1);
    			append_dev(div1, i1);
    			i1.innerHTML = water;
    			append_dev(div1, t3);
    			append_dev(div1, t4);
    			append_dev(div5, t5);
    			append_dev(div5, div2);
    			append_dev(div2, i2);
    			i2.innerHTML = grind;
    			append_dev(div2, span);
    			append_dev(span, t6);
    			append_dev(div5, t7);
    			append_dev(div5, div3);
    			append_dev(div3, t8);
    			append_dev(div3, t9);
    			append_dev(div5, t10);
    			append_dev(div5, div4);
    			append_dev(div4, i3);
    			i3.innerHTML = time;
    			append_dev(div4, t11);
    			append_dev(div5, t12);
    			if (if_block0) if_block0.m(div5, null);
    			insert_dev(target, t13, anchor);
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t14);
    			insert_dev(target, t15, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div9, anchor);
    			if (if_block2) if_block2.m(div9, null);
    			append_dev(div9, t17);
    			if (if_block3) if_block3.m(div9, null);
    			append_dev(div9, t18);
    			append_dev(div9, div6);
    			append_dev(div6, t19);
    			append_dev(div6, t20);
    			append_dev(div9, t21);
    			append_dev(div9, div8);
    			if (if_block4) if_block4.m(div8, null);
    			append_dev(div8, t22);
    			append_dev(div8, div7);
    			if_block5.m(div7, null);
    			append_dev(div8, t23);
    			if (if_block6) if_block6.m(div8, null);
    			insert_dev(target, t24, anchor);
    			insert_dev(target, div10, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div10, null);
    			}

    			if (remount) dispose();
    			dispose = listen_dev(div8, "click", /*toggleTime*/ ctx[6], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recipe*/ 8 && t0_value !== (t0_value = /*$recipe*/ ctx[3].ingridients.coffee + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$translations*/ 16 && t1_value !== (t1_value = tt(/*$translations*/ ctx[4], "global.g") + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$recipe*/ 8 && t3_value !== (t3_value = /*$recipe*/ ctx[3].ingridients.water + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$translations*/ 16 && t4_value !== (t4_value = tt(/*$translations*/ ctx[4], "global.ml") + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*$recipe, $translations*/ 24 && t6_value !== (t6_value = getGrindLevel(/*$recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[4]) + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*$recipe*/ 8 && t8_value !== (t8_value = /*$recipe*/ ctx[3].ingridients.temp + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*$recipe*/ 8 && t11_value !== (t11_value = toMSS(/*$recipe*/ ctx[3].ingridients.time) + "")) set_data_dev(t11, t11_value);

    			if (/*$recipe*/ ctx[3].ingridients.inverted) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_16(ctx);
    					if_block0.c();
    					if_block0.m(div5, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$recipe*/ 8 && t14_value !== (t14_value = /*$recipe*/ ctx[3].title + "")) set_data_dev(t14, t14_value);

    			if (/*$recipe*/ ctx[3].notes) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_15(ctx);
    					if_block1.c();
    					if_block1.m(t16.parentNode, t16);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (/*$timer*/ ctx[2].step !== null && /*$timer*/ ctx[2].step < /*$recipe*/ ctx[3].steps.length - 1) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);

    					if (dirty & /*$timer, $recipe*/ 12) {
    						transition_in(if_block2, 1);
    					}
    				} else {
    					if_block2 = create_if_block_14(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(div9, t17);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (/*$timer*/ ctx[2].step !== null) {
    				if (if_block3) {
    					if_block3.p(ctx, dirty);

    					if (dirty & /*$timer*/ 4) {
    						transition_in(if_block3, 1);
    					}
    				} else {
    					if_block3 = create_if_block_13(ctx);
    					if_block3.c();
    					transition_in(if_block3, 1);
    					if_block3.m(div9, t18);
    				}
    			} else if (if_block3) {
    				group_outros();

    				transition_out(if_block3, 1, 1, () => {
    					if_block3 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*$timer*/ 4 && t19_value !== (t19_value = parseInt(/*$timer*/ ctx[2].water) + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*$translations*/ 16 && t20_value !== (t20_value = tt(/*$translations*/ ctx[4], "global.ml") + "")) set_data_dev(t20, t20_value);

    			if (/*$timer*/ ctx[2].step !== null) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block_10(ctx);
    					if_block4.c();
    					if_block4.m(div8, t22);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block5) {
    				if_block5.p(ctx, dirty);
    			} else {
    				if_block5.d(1);
    				if_block5 = current_block_type(ctx);

    				if (if_block5) {
    					if_block5.c();
    					if_block5.m(div7, null);
    				}
    			}

    			if (/*$timer*/ ctx[2].step !== null && /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].type === "pour") {
    				if (if_block6) {
    					if_block6.p(ctx, dirty);

    					if (dirty & /*$timer, $recipe*/ 12) {
    						transition_in(if_block6, 1);
    					}
    				} else {
    					if_block6 = create_if_block_6(ctx);
    					if_block6.c();
    					transition_in(if_block6, 1);
    					if_block6.m(div8, null);
    				}
    			} else if (if_block6) {
    				group_outros();

    				transition_out(if_block6, 1, 1, () => {
    					if_block6 = null;
    				});

    				check_outros();
    			}

    			if (dirty & /*$timer, toMSS, $recipe, time, tt, $translations, resolveStepIcon*/ 28) {
    				each_value = /*$recipe*/ ctx[3].steps;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div10, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block2);
    			transition_in(if_block3);
    			transition_in(if_block6);
    		},
    		o: function outro(local) {
    			transition_out(if_block2);
    			transition_out(if_block3);
    			transition_out(if_block6);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (if_block0) if_block0.d();
    			if (detaching) detach_dev(t13);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t15);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div9);
    			if (if_block2) if_block2.d();
    			if (if_block3) if_block3.d();
    			if (if_block4) if_block4.d();
    			if_block5.d();
    			if (if_block6) if_block6.d();
    			if (detaching) detach_dev(t24);
    			if (detaching) detach_dev(div10);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(74:37) ",
    		ctx
    	});

    	return block;
    }

    // (72:29) 
    function create_if_block_1$2(ctx) {
    	let current;
    	const loader = new Loader({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loader.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loader, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loader.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loader.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loader, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(72:29) ",
    		ctx
    	});

    	return block;
    }

    // (70:0) {#if $recipe.error}
    function create_if_block$3(ctx) {
    	let current;

    	const error = new Error$1({
    			props: { error: /*$recipe*/ ctx[3].error },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(error.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(error, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const error_changes = {};
    			if (dirty & /*$recipe*/ 8) error_changes.error = /*$recipe*/ ctx[3].error;
    			error.$set(error_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(error.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(error.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(error, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(70:0) {#if $recipe.error}",
    		ctx
    	});

    	return block;
    }

    // (81:4) {#if $recipe.ingridients.inverted}
    function create_if_block_16(ctx) {
    	let div;
    	let t_value = tt(/*$translations*/ ctx[4], "global.inverted") + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "recipe-pad recipe-inverted svelte-gytla1");
    			add_location(div, file$5, 81, 6, 2469);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 16 && t_value !== (t_value = tt(/*$translations*/ ctx[4], "global.inverted") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_16.name,
    		type: "if",
    		source: "(81:4) {#if $recipe.ingridients.inverted}",
    		ctx
    	});

    	return block;
    }

    // (88:2) {#if $recipe.notes}
    function create_if_block_15(ctx) {
    	let div;
    	let t_value = /*$recipe*/ ctx[3].notes + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "recipe-notes svelte-gytla1");
    			add_location(div, file$5, 88, 4, 2655);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recipe*/ 8 && t_value !== (t_value = /*$recipe*/ ctx[3].notes + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_15.name,
    		type: "if",
    		source: "(88:2) {#if $recipe.notes}",
    		ctx
    	});

    	return block;
    }

    // (94:3) {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}
    function create_if_block_14(ctx) {
    	let div;
    	let i;
    	let div_transition;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "svelte-gytla1");
    			add_location(i, file$5, 95, 8, 2915);
    			attr_dev(div, "class", "actions bh next-step svelte-gytla1");
    			add_location(div, file$5, 94, 6, 2829);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			i.innerHTML = next;
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*goToNext*/ ctx[5], false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_14.name,
    		type: "if",
    		source: "(94:3) {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}",
    		ctx
    	});

    	return block;
    }

    // (99:4) {#if $timer.step !== null}
    function create_if_block_13(ctx) {
    	let div;
    	let i;
    	let div_transition;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "svelte-gytla1");
    			add_location(i, file$5, 100, 8, 3077);
    			attr_dev(div, "class", "actions bh stop svelte-gytla1");
    			add_location(div, file$5, 99, 6, 2995);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, i);
    			i.innerHTML = stop;
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", stopTimer, false, false, false);
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_13.name,
    		type: "if",
    		source: "(99:4) {#if $timer.step !== null}",
    		ctx
    	});

    	return block;
    }

    // (108:6) {#if $timer.step !== null }
    function create_if_block_10(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	const if_block_creators = [create_if_block_11, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*pausedTime*/ ctx[1] !== false) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(108:6) {#if $timer.step !== null }",
    		ctx
    	});

    	return block;
    }

    // (116:8) {:else}
    function create_else_block_1(ctx) {
    	let t;
    	let div;
    	let div_transition;
    	let current;
    	let if_block = /*$timer*/ ctx[2].step !== null && /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].type === "pour" && create_if_block_12(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			t = space();
    			div = element("div");
    			attr_dev(div, "class", "timer-bottom svelte-gytla1");
    			add_location(div, file$5, 124, 10, 4081);
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, t, anchor);
    			insert_dev(target, div, anchor);
    			div.innerHTML = pause;
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*$timer*/ ctx[2].step !== null && /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].type === "pour") {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$timer, $recipe*/ 12) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_12(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(t.parentNode, t);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);

    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(t);
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(116:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (109:8) {#if pausedTime !== false}
    function create_if_block_11(ctx) {
    	let div0;
    	let t0_value = tt(/*$translations*/ ctx[4], "global.paused") + "";
    	let t0;
    	let div0_transition;
    	let t1;
    	let div1;
    	let div1_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div1 = element("div");
    			attr_dev(div0, "class", "timer-top svelte-gytla1");
    			add_location(div0, file$5, 109, 10, 3361);
    			attr_dev(div1, "class", "timer-bottom svelte-gytla1");
    			add_location(div1, file$5, 112, 10, 3484);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			div1.innerHTML = play;
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$translations*/ 16) && t0_value !== (t0_value = tt(/*$translations*/ ctx[4], "global.paused") + "")) set_data_dev(t0, t0_value);
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div0_transition) div0_transition = create_bidirectional_transition(div0, scale, {}, true);
    					div0_transition.run(1);
    				});
    			}

    			if (local) {
    				add_render_callback(() => {
    					if (!div1_transition) div1_transition = create_bidirectional_transition(div1, scale, {}, true);
    					div1_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div0_transition) div0_transition = create_bidirectional_transition(div0, scale, {}, false);
    				div0_transition.run(0);
    			}

    			if (local) {
    				if (!div1_transition) div1_transition = create_bidirectional_transition(div1, scale, {}, false);
    				div1_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching && div0_transition) div0_transition.end();
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div1);
    			if (detaching && div1_transition) div1_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(109:8) {#if pausedTime !== false}",
    		ctx
    	});

    	return block;
    }

    // (117:10) {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}
    function create_if_block_12(ctx) {
    	let div;
    	let span;
    	let t0_value = parseInt(/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) + "";
    	let t0;
    	let t1;
    	let t2_value = tt(/*$translations*/ ctx[4], "global.ml") + "";
    	let t2;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			attr_dev(span, "class", "step-water svelte-gytla1");
    			toggle_class(span, "inverted", (/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) / /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].amount > 0.9);
    			add_location(span, file$5, 118, 14, 3748);
    			attr_dev(div, "class", "timer-top svelte-gytla1");
    			add_location(div, file$5, 117, 12, 3687);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span);
    			append_dev(span, t0);
    			append_dev(span, t1);
    			append_dev(span, t2);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$timer, $recipe*/ 12) && t0_value !== (t0_value = parseInt(/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) + "")) set_data_dev(t0, t0_value);
    			if ((!current || dirty & /*$translations*/ 16) && t2_value !== (t2_value = tt(/*$translations*/ ctx[4], "global.ml") + "")) set_data_dev(t2, t2_value);

    			if (dirty & /*$timer, calculateWater, $recipe*/ 12) {
    				toggle_class(span, "inverted", (/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) / /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].amount > 0.9);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			if (local) {
    				add_render_callback(() => {
    					if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, true);
    					div_transition.run(1);
    				});
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, scale, {}, false);
    				div_transition.run(0);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_transition) div_transition.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_12.name,
    		type: "if",
    		source: "(117:10) {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}",
    		ctx
    	});

    	return block;
    }

    // (137:8) {:else}
    function create_else_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "timer-button svelte-gytla1");
    			add_location(div, file$5, 137, 10, 4474);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = play;
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(137:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (135:37) 
    function create_if_block_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(135:37) ",
    		ctx
    	});

    	return block;
    }

    // (133:31) 
    function create_if_block_8(ctx) {
    	let t_value = tt(/*$translations*/ ctx[4], "global.enjoy") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 16 && t_value !== (t_value = tt(/*$translations*/ ctx[4], "global.enjoy") + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(133:31) ",
    		ctx
    	});

    	return block;
    }

    // (131:8) {#if $timer.time}
    function create_if_block_7(ctx) {
    	let div;
    	let t_value = toMSS(/*$timer*/ ctx[2].time) + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "counter svelte-gytla1");
    			add_location(div, file$5, 131, 10, 4270);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$timer*/ 4 && t_value !== (t_value = toMSS(/*$timer*/ ctx[2].time) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(131:8) {#if $timer.time}",
    		ctx
    	});

    	return block;
    }

    // (141:6) {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}
    function create_if_block_6(ctx) {
    	let div;
    	let div_outro;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "water-level svelte-gytla1");
    			set_style(div, "height", (/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) / /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].amount * 100 + "%");
    			add_location(div, file$5, 141, 8, 4633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*$timer, $recipe*/ 12) {
    				set_style(div, "height", (/*$timer*/ ctx[2].water - calculateWater(/*$recipe*/ ctx[3], /*$timer*/ ctx[2].step)) / /*$recipe*/ ctx[3].steps[/*$timer*/ ctx[2].step].amount * 100 + "%");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div_outro) div_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				div_outro = create_out_transition(div, fade, {});
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching && div_outro) div_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(141:6) {#if $timer.step !== null && $recipe.steps[$timer.step].type === 'pour'}",
    		ctx
    	});

    	return block;
    }

    // (152:6) {#if index >= $timer.step}
    function create_if_block_3(ctx) {
    	let div4;
    	let div1;
    	let div0;
    	let raw0_value = resolveStepIcon(/*step*/ ctx[8].type) + "";
    	let t0;
    	let t1_value = tt(/*$translations*/ ctx[4], `step.${/*step*/ ctx[8].type}`) + "";
    	let t1;
    	let t2;
    	let t3;
    	let div3;
    	let div2;
    	let t4;
    	let t5_value = toMSS(/*step*/ ctx[8].time) + "";
    	let t5;
    	let t6;
    	let div4_outro;
    	let current;

    	function select_block_type_3(ctx, dirty) {
    		if (/*step*/ ctx[8].amount) return create_if_block_4;
    		if (/*step*/ ctx[8].notes) return create_if_block_5;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			if (if_block) if_block.c();
    			t3 = space();
    			div3 = element("div");
    			div2 = element("div");
    			t4 = space();
    			t5 = text(t5_value);
    			t6 = space();
    			attr_dev(div0, "class", "step-icon svelte-gytla1");
    			add_location(div0, file$5, 154, 12, 5093);
    			attr_dev(div1, "class", "step-type svelte-gytla1");
    			add_location(div1, file$5, 153, 10, 5057);
    			attr_dev(div2, "class", "step-icon svelte-gytla1");
    			add_location(div2, file$5, 163, 12, 5494);
    			attr_dev(div3, "class", "step-time svelte-gytla1");
    			add_location(div3, file$5, 162, 10, 5458);
    			attr_dev(div4, "class", "step b svelte-gytla1");
    			toggle_class(div4, "active", /*$timer*/ ctx[2].step === /*index*/ ctx[10]);
    			add_location(div4, file$5, 152, 8, 4971);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			div0.innerHTML = raw0_value;
    			append_dev(div1, t0);
    			append_dev(div1, t1);
    			append_dev(div4, t2);
    			if (if_block) if_block.m(div4, null);
    			append_dev(div4, t3);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			div2.innerHTML = time;
    			append_dev(div3, t4);
    			append_dev(div3, t5);
    			append_dev(div4, t6);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if ((!current || dirty & /*$recipe*/ 8) && raw0_value !== (raw0_value = resolveStepIcon(/*step*/ ctx[8].type) + "")) div0.innerHTML = raw0_value;			if ((!current || dirty & /*$translations, $recipe*/ 24) && t1_value !== (t1_value = tt(/*$translations*/ ctx[4], `step.${/*step*/ ctx[8].type}`) + "")) set_data_dev(t1, t1_value);

    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div4, t3);
    				}
    			}

    			if ((!current || dirty & /*$recipe*/ 8) && t5_value !== (t5_value = toMSS(/*step*/ ctx[8].time) + "")) set_data_dev(t5, t5_value);

    			if (dirty & /*$timer*/ 4) {
    				toggle_class(div4, "active", /*$timer*/ ctx[2].step === /*index*/ ctx[10]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (div4_outro) div4_outro.end(1);
    			current = true;
    		},
    		o: function outro(local) {
    			if (local) {
    				div4_outro = create_out_transition(div4, scale, {});
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);

    			if (if_block) {
    				if_block.d();
    			}

    			if (detaching && div4_outro) div4_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(152:6) {#if index >= $timer.step}",
    		ctx
    	});

    	return block;
    }

    // (160:31) 
    function create_if_block_5(ctx) {
    	let div;
    	let t_value = /*step*/ ctx[8].notes + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "step-amount svelte-gytla1");
    			add_location(div, file$5, 160, 12, 5388);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recipe*/ 8 && t_value !== (t_value = /*step*/ ctx[8].notes + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(160:31) ",
    		ctx
    	});

    	return block;
    }

    // (158:10) {#if step.amount}
    function create_if_block_4(ctx) {
    	let div;
    	let t0_value = /*step*/ ctx[8].amount + "";
    	let t0;
    	let t1_value = tt(/*$translations*/ ctx[4], "global.ml") + "";
    	let t1;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text(t0_value);
    			t1 = text(t1_value);
    			attr_dev(div, "class", "step-amount svelte-gytla1");
    			add_location(div, file$5, 158, 12, 5267);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recipe*/ 8 && t0_value !== (t0_value = /*step*/ ctx[8].amount + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$translations*/ 16 && t1_value !== (t1_value = tt(/*$translations*/ ctx[4], "global.ml") + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(158:10) {#if step.amount}",
    		ctx
    	});

    	return block;
    }

    // (151:4) {#each $recipe.steps as step, index}
    function create_each_block$2(ctx) {
    	let if_block_anchor;
    	let if_block = /*index*/ ctx[10] >= /*$timer*/ ctx[2].step && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*index*/ ctx[10] >= /*$timer*/ ctx[2].step) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*$timer*/ 4) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(151:4) {#each $recipe.steps as step, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	const back = new Back({
    			props: {
    				nomargin: true,
    				href: "/" + /*params*/ ctx[0].type
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block$3, create_if_block_1$2, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$recipe*/ ctx[3].error) return 0;
    		if (/*$recipe*/ ctx[3].isFetching) return 1;
    		if (/*$recipe*/ ctx[3].ingridients.coffee) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(back.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(div, "class", "back-container svelte-gytla1");
    			add_location(div, file$5, 65, 0, 1611);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$3("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(back, div, null);
    			insert_dev(target, t, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const back_changes = {};
    			if (dirty & /*params*/ 1) back_changes.href = "/" + /*params*/ ctx[0].type;
    			back.$set(back_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(back.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(back.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(back);
    			if (detaching) detach_dev(t);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $timer;
    	let $recipe;
    	let $translations;
    	validate_store(timer, "timer");
    	component_subscribe($$self, timer, $$value => $$invalidate(2, $timer = $$value));
    	validate_store(recipe, "recipe");
    	component_subscribe($$self, recipe, $$value => $$invalidate(3, $recipe = $$value));
    	validate_store(translations, "translations");
    	component_subscribe($$self, translations, $$value => $$invalidate(4, $translations = $$value));
    	let { params = {} } = $$props;
    	const noSleep = new src();
    	let pausedTime = false;

    	onMount(() => {
    		fetchCurrentRecipe(params.type, params.name);
    	});

    	onDestroy(() => {
    		destroyTimer();
    	});

    	function goToNext() {
    		$$invalidate(1, pausedTime = false);
    		nextStep();
    	}

    	function toggleTime() {
    		if ($timer.step !== null) {
    			if (pausedTime !== false) {
    				noSleep.enable();
    				startTimer($timer.step, pausedTime);
    				$$invalidate(1, pausedTime = false);
    			} else {
    				$$invalidate(1, pausedTime = pauseTimer());
    			}
    		} else {
    			startTimer();
    			noSleep.enable();
    			$$invalidate(1, pausedTime = false);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Timer", $$slots, []);

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		scale,
    		fade,
    		NoSleep: src,
    		Error: Error$1,
    		Loader,
    		Back,
    		toMSS,
    		resolveStepIcon,
    		getGrindLevel,
    		recipe,
    		timer,
    		startTimer,
    		stopTimer,
    		pauseTimer,
    		nextStep,
    		destroyTimer,
    		fetchCurrentRecipe,
    		calculateWater,
    		tt,
    		translations,
    		time,
    		coffee,
    		grind,
    		water,
    		play,
    		stop,
    		next,
    		pause,
    		params,
    		noSleep,
    		pausedTime,
    		goToNext,
    		toggleTime,
    		$timer,
    		$recipe,
    		$translations
    	});

    	$$self.$inject_state = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    		if ("pausedTime" in $$props) $$invalidate(1, pausedTime = $$props.pausedTime);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [params, pausedTime, $timer, $recipe, $translations, goToNext, toggleTime];
    }

    class Timer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timer",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get params() {
    		throw new Error_1$3("<Timer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set params(value) {
    		throw new Error_1$3("<Timer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/views/NotFound.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$4 } = globals;

    function create_fragment$7(ctx) {
    	let current;

    	const error = new Error$1({
    			props: {
    				error: {
    					response: { status: 404, statusText: "Not Found" }
    				}
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(error.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error_1$4("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(error, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(error.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(error.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(error, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<NotFound> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("NotFound", $$slots, []);
    	$$self.$capture_state = () => ({ Error: Error$1 });
    	return [];
    }

    class NotFound extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    var routes = {
      '/': Home,
      '/:type': Recipes,
      '/:type/:name': Timer,
      '*': NotFound
    };

    /* src/App.svelte generated by Svelte v3.22.2 */
    const file$6 = "src/App.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let current;
    	const router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(div, "class", "page svelte-1w4h5f0");
    			add_location(div, file$6, 5, 1, 93);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(router, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(router);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);
    	$$self.$capture_state = () => ({ Router, routes });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
