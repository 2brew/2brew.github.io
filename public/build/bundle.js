
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
    		enjoy: "Enjoy your coffee"
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
    		heat: "Heat the water"
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
    		enjoy: "Кофе готов!"
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
    		swirl: "Наливайте по спирали",
    		invert: "Переверните",
    		brew: "Варите",
    		heat: "Нагрейте воду"
    	}
    };
    var i18n = {
    	en: en,
    	ru: ru
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
      if (['en', 'ru'].indexOf(lang) !== -1) {
        localStorage.setItem('lang', lang);
        translations.set({tt: i18n[lang], language: lang});
      }
    }

    var aeropress = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"176\" height=\"176\" viewBox=\"0 0 176 176\">\n  <g fill-rule=\"evenodd\">\n    <rect width=\"48\" height=\"16\" x=\"64\" y=\"144\" rx=\"8\"/>\n    <path d=\"M110,40 C115.522847,40 120,44.4771525 120,50 L120,142 C120,147.522847 115.522847,152 110,152 L66,152 C60.4771525,152 56,147.522847 56,142 L56,50 C56,44.4771525 60.4771525,40 66,40 L110,40 Z M108,48 L68,48 C65.790861,48 64,49.790861 64,52 L64,52 L64,140 C64,142.209139 65.790861,144 68,144 L68,144 L108,144 C110.209139,144 112,142.209139 112,140 L112,140 L112,52 C112,49.790861 110.209139,48 108,48 L108,48 Z\"/>\n    <rect width=\"80\" height=\"8\" x=\"48\" y=\"144\" rx=\"4\"/>\n    <path d=\"M99,24 C103.970563,24 108,28.0294373 108,33 L108,123 C108,127.970563 103.970563,132 99,132 L77,132 C72.0294373,132 68,127.970563 68,123 L68,33 C68,28.0294373 72.0294373,24 77,24 L99,24 Z M96,32 L80,32 C77.790861,32 76,33.790861 76,36 L76,36 L76,120 C76,122.209139 77.790861,124 80,124 L80,124 L96,124 C98.209139,124 100,122.209139 100,120 L100,120 L100,36 C100,33.790861 98.209139,32 96,32 L96,32 Z\"/>\n    <rect width=\"64\" height=\"8\" x=\"56\" y=\"24\" rx=\"4\"/>\n    <rect width=\"16\" height=\"8\" x=\"88\" y=\"56\" rx=\"4\"/>\n    <rect width=\"16\" height=\"8\" x=\"88\" y=\"80\" rx=\"4\"/>\n    <rect width=\"16\" height=\"8\" x=\"88\" y=\"104\" rx=\"4\"/>\n  </g>\n</svg>";

    var moka = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"176\" height=\"176\" viewBox=\"0 0 176 176\">\n  <g fill-rule=\"evenodd\">\n    <path d=\"M119.99934 120L136.763932 153.527864C139.233825 158.467649 137.231581 164.474379 132.291796 166.944272 130.903242 167.638549 129.372111 168 127.81966 168L48.1803399 168C42.6574924 168 38.1803399 163.522847 38.1803399 158 38.1803399 156.447549 38.5417908 154.916418 39.236068 153.527864L55.9993399 120 65.4753399 120 47.9806599 154.177316C47.6918587 154.741485 47.5412527 155.366207 47.5412527 156 47.5412527 158.142195 49.2252212 159.891079 51.3416124 159.995105L51.5412527 160 124.458747 160C125.09254 160 125.717262 159.849394 126.281432 159.560593 128.184459 158.586424 128.974545 156.297811 128.111206 154.368941L128.01934 154.177316 110.52334 120 119.99934 120zM68.9442719 112L110.566019 112C113.324339 112 115.888098 113.420958 117.350005 115.760008L120 120 120 120 56 120C58.4514643 115.097071 63.4626312 112 68.9442719 112z\"/>\n    <path d=\"M120.513846,32 L140.994699,74.2554157 C141.958206,76.2433667 141.12773,78.6359963 139.139779,79.5995035 C138.595971,79.8630732 137.99951,80 137.395195,80 L49.6758462,80 C44.1529987,80 39.6758462,75.5228475 39.6758462,70 C39.6758462,68.447549 40.0372971,66.9164184 40.7315742,65.527864 L57.4948462,32 L66.9708462,32 L49.4702544,66.1888642 C49.1825425,66.7509061 49.0319698,67.3730749 49.0308535,68.0044764 C49.0270659,70.1466684 50.7079396,71.8985266 52.8241436,72.0062941 L53.023775,72.0115424 L130.860445,72.1491626 C131.01925,72.1494434 131.175839,72.111899 131.31725,72.0396369 C131.773917,71.8062777 131.974631,71.2701885 131.799762,70.8010368 L131.752686,70.6941275 L111.978846,32 L120.513846,32 Z\" transform=\"rotate(-180 88.749 56)\"/>\n    <path d=\"M120,76 L120,94 C120,99.5228475 115.522847,104 110,104 L66,104 C60.4771525,104 56,99.5228475 56,94 L56,76 L120,76 Z M108,83 L68,83 C65.790861,83 64,84.790861 64,87 L64,87 L64,92 C64,94.209139 65.790861,96 68,96 L68,96 L108,96 C110.209139,96 112,94.209139 112,92 L112,92 L112,87 C112,84.790861 110.209139,83 108,83 L108,83 Z\"/>\n    <path d=\"M117,96 L117,120 L59,120 L59,96 L117,96 Z M107,104 L71,104 C68.790861,104 67,105.790861 67,108 C67,110.209139 68.790861,112 71,112 L71,112 L107,112 C109.209139,112 111,110.209139 111,108 C111,105.790861 109.209139,104 107,104 L107,104 Z\"/>\n    <path d=\"M78.4691816 112L79 112C80.9159761 112 82.4691816 113.553206 82.4691816 115.469182 82.4691816 115.633339 82.45753 115.79729 82.4343146 115.959798L75.4906164 164.565685C75.2091028 166.53628 73.5214199 168 71.5308184 168L71 168C69.0840239 168 67.5308184 166.446794 67.5308184 164.530818 67.5308184 164.366661 67.54247 164.20271 67.5656854 164.040202L74.5093836 115.434315C74.7908972 113.46372 76.4785801 112 78.4691816 112zM97 112L97.5308184 112C99.5214199 112 101.209103 113.46372 101.490616 115.434315L108.434315 164.040202C108.705275 165.936922 107.387336 167.694173 105.490616 167.965133 105.328108 167.988348 105.164158 168 105 168L104.469182 168C102.47858 168 100.790897 166.53628 100.509384 164.565685L93.5656854 115.959798C93.2947255 114.063078 94.6126641 112.305827 96.5093836 112.034867 96.6718915 112.011652 96.8358423 112 97 112z\"/>\n    <path d=\"M104.421462,32 L105,32 C106.889621,32 108.421462,33.5318406 108.421462,35.4214618 C108.421462,35.5990053 108.407642,35.7762794 108.380129,35.9516781 L101.530216,79.6198711 C101.224958,81.5658948 99.5483582,83 97.5785382,83 L97,83 C95.1103788,83 93.5785382,81.4681594 93.5785382,79.5785382 C93.5785382,79.4009947 93.5923576,79.2237206 93.6198711,79.0483219 L100.469784,35.3801289 C100.775042,33.4341052 102.451642,32 104.421462,32 Z\" transform=\"rotate(-180 101 57.5)\"/>\n    <path d=\"M71,32 L71.5785382,32 C73.5483582,32 75.2249577,33.4341052 75.5302163,35.3801289 L82.3801289,79.0483219 C82.6729593,80.9151156 81.39701,82.6658367 79.5302163,82.9586671 C79.3548176,82.9861806 79.1775435,83 79,83 L78.4214618,83 C76.4516418,83 74.7750423,81.5658948 74.4697837,79.6198711 L67.6198711,35.9516781 C67.3270407,34.0848844 68.60299,32.3341633 70.4697837,32.0413329 C70.6451824,32.0138194 70.8224565,32 71,32 Z\" transform=\"rotate(-180 75 57.5)\"/>\n    <path d=\"M88,20 C104.709392,20 119.578025,24.6984228 129.09139,32.0000799 L115.240005,32.0001336 C107.403238,28.8375253 98.0477293,27 88,27 C77.9522707,27 68.5967624,28.8375253 60.7599949,32.0001336 L46.9084252,32.0002215 C56.4217824,24.6984835 71.2904999,20 88,20 Z\"/>\n    <path d=\"M84.5945053,8 L91.2781583,8 C93.4872973,8 95.2781583,9.790861 95.2781583,12 C95.2781583,12.2203234 95.259955,12.4402702 95.223734,12.6575959 L93.5570673,22.6575959 C93.2356087,24.5863478 91.5668483,26 89.6114916,26 L85.9846112,26 C83.9882783,26 82.2975762,24.528066 82.0227078,22.5507465 L80.6326019,12.5507465 C80.328433,10.3626477 81.85566,8.34226553 84.0437588,8.03809663 C84.2262445,8.01272919 84.4102649,8 84.5945053,8 Z\"/>\n    <rect width=\"27\" height=\"16\" x=\"129\" y=\"32\" rx=\"4\"/>\n    <rect width=\"11\" height=\"56\" x=\"145\" y=\"32\" rx=\"4\"/>\n  </g>\n</svg>";

    var v60 = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"176\" height=\"176\" viewBox=\"0 0 176 176\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <rect width=\"112\" height=\"8\" x=\"32\" y=\"128\" fill=\"#000\" rx=\"4\"/>\n    <rect width=\"128\" height=\"8\" x=\"24\" y=\"32\" fill=\"#000\" rx=\"4\"/>\n    <path fill=\"#000\" d=\"M64,147.944994 C64,150.08719 65.6839685,151.836073 67.8003597,151.940099 L68,151.944994 L108,151.944994 C110.142195,151.944994 111.891079,150.261026 111.995105,148.144635 L112,147.944994 L112.000695,128 C116.500311,128.49776 120,132.312679 120,136.944994 L120,150.944994 C120,155.915557 115.970563,159.944994 111,159.944994 L65,159.944994 C60.0294373,159.944994 56,155.915557 56,150.944994 L56,137.944994 C56,133.107072 59.4355289,129.07156 64.0000191,128.145027 L64,147.944994 Z\"/>\n    <polygon fill=\"#000\" points=\"64 128 24 36 32 36 72 128\"/>\n    <polygon fill=\"#000\" points=\"104 128 144 36 152 36 112 128\"/>\n    <path fill=\"#000\" d=\"M148.631231,48 C157.467787,48 164.631231,55.163444 164.631231,64 C164.631231,64.7571019 164.577493,65.5132491 164.470423,66.2627417 L161.041851,90.2627417 C159.915797,98.1451215 153.165065,104 145.202659,104 L137.527541,104 C131.088618,104 125.538048,100.196511 123,94.7137011 L131.031,76.242 L128.993172,86.4310709 C128.889855,86.9476564 128.837817,87.4731841 128.837817,88 C128.837817,92.3349143 132.285655,95.8645429 136.588638,95.9961932 L136.837817,96 L144.520955,96 C148.247734,96 151.468206,93.4292813 152.310703,89.8222449 L152.3656,89.5689291 L157.1656,65.5689291 C157.268917,65.0523436 157.320955,64.5268159 157.320955,64 C157.320955,59.581722 153.739233,56 149.320955,56 L141.637817,56 C140.983535,56 140.344859,56.079235 139.731915,56.2294021 L143.31,48 L148.631231,48 Z\"/>\n    <path fill=\"#000\" d=\"M108,48 L108.876894,48 C110.712365,48 112.312297,49.2491895 112.757464,51.0298575 L128,112 L128,112 L105.404494,51.7453167 C104.866947,50.3118582 105.593227,48.7140426 107.026685,48.1764956 C107.337917,48.0597836 107.667604,48 108,48 Z\" transform=\"matrix(-1 0 0 1 232 0)\"/>\n    <path fill=\"#000\" d=\"M96,48 L96.2421951,48 C98.3544482,48 100.102647,49.6423472 100.234405,51.7504869 L104,112 L104,112 L92.7371541,51.9314887 C92.3992754,50.1294687 93.5861964,48.394738 95.3882164,48.0568593 C95.5899481,48.0190346 95.7947529,48 96,48 Z\" transform=\"matrix(-1 0 0 1 196 0)\"/>\n    <path fill=\"#000\" d=\"M79.6116424,48 L79.8447266,48 C81.6825272,48 83.172359,49.4898318 83.172359,51.3276325 C83.172359,51.5307633 83.1537593,51.7334675 83.1167929,51.9332064 L72,112 L72,112 L75.6188406,51.760137 C75.7457271,49.6479626 77.4956601,48 79.6116424,48 Z\" transform=\"matrix(-1 0 0 1 155.845 0)\"/>\n    <path fill=\"#000\" d=\"M67.1231056,48 L68,48 C69.5309344,48 70.7720019,49.2410675 70.7720019,50.7720019 C70.7720019,51.104398 70.7122183,51.4340845 70.5955062,51.7453167 L48,112 L48,112 L63.2425356,51.0298575 C63.6877026,49.2491895 65.2876351,48 67.1231056,48 Z\" transform=\"matrix(-1 0 0 1 120 0)\"/>\n    <rect width=\"112\" height=\"8\" x=\"32\" y=\"128\" fill=\"#000\" rx=\"4\"/>\n  </g>\n</svg>";

    var _invert = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <path d=\"M64,6.5 C73.2479584,6.5 81.783986,12.8431281 87.993977,23.7704625 C94.0530202,34.4321834 97.5,48.7502337 97.5,64 C97.5,95.3301091 83.0206046,120.982352 64.5606016,121.492264 L64,121.5 L64,118.5 C80.6196098,118.5 94.5,94.2093171 94.5,64 C94.5,49.2491127 91.1758282,35.4411817 85.3857384,25.2527214 C79.6607017,15.1787308 72.0187619,9.5 64,9.5 C56.0229114,9.5 48.4183151,15.1192172 42.7013438,25.1000906 C39.3837088,30.8921249 36.8369272,37.9369672 35.2741152,45.7150263 L43.0718643,46.3956306 L31.9565457,64.4981081 L24.1437549,44.7443667 L32.2673975,45.4532903 C33.885224,37.2398226 36.5667335,29.7742506 40.0981454,23.6089976 C46.3015318,12.7789251 54.7989236,6.5 64,6.5 Z\"/>\n</svg>";

    var _lid = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M64,16 C90.509668,16 112,37.490332 112,64 C112,90.509668 90.509668,112 64,112 C37.490332,112 16,90.509668 16,64 C16,37.490332 37.490332,16 64,16 Z M48,92 C45.790861,92 44,93.790861 44,96 C44,98.209139 45.790861,100 48,100 C50.209139,100 52,98.209139 52,96 C52,93.790861 50.209139,92 48,92 Z M64,92 C61.790861,92 60,93.790861 60,96 C60,98.209139 61.790861,100 64,100 C66.209139,100 68,98.209139 68,96 C68,93.790861 66.209139,92 64,92 Z M80,92 C77.790861,92 76,93.790861 76,96 C76,98.209139 77.790861,100 80,100 C82.209139,100 84,98.209139 84,96 C84,93.790861 82.209139,92 80,92 Z M40,76 C37.790861,76 36,77.790861 36,80 C36,82.209139 37.790861,84 40,84 C42.209139,84 44,82.209139 44,80 C44,77.790861 42.209139,76 40,76 Z M56,76 C53.790861,76 52,77.790861 52,80 C52,82.209139 53.790861,84 56,84 C58.209139,84 60,82.209139 60,80 C60,77.790861 58.209139,76 56,76 Z M72,76 C69.790861,76 68,77.790861 68,80 C68,82.209139 69.790861,84 72,84 C74.209139,84 76,82.209139 76,80 C76,77.790861 74.209139,76 72,76 Z M88,76 C85.790861,76 84,77.790861 84,80 C84,82.209139 85.790861,84 88,84 C90.209139,84 92,82.209139 92,80 C92,77.790861 90.209139,76 88,76 Z M32,60 C29.790861,60 28,61.790861 28,64 C28,66.209139 29.790861,68 32,68 C34.209139,68 36,66.209139 36,64 C36,61.790861 34.209139,60 32,60 Z M48,60 C45.790861,60 44,61.790861 44,64 C44,66.209139 45.790861,68 48,68 C50.209139,68 52,66.209139 52,64 C52,61.790861 50.209139,60 48,60 Z M64,60 C61.790861,60 60,61.790861 60,64 C60,66.209139 61.790861,68 64,68 C66.209139,68 68,66.209139 68,64 C68,61.790861 66.209139,60 64,60 Z M80,60 C77.790861,60 76,61.790861 76,64 C76,66.209139 77.790861,68 80,68 C82.209139,68 84,66.209139 84,64 C84,61.790861 82.209139,60 80,60 Z M96,60 C93.790861,60 92,61.790861 92,64 C92,66.209139 93.790861,68 96,68 C98.209139,68 100,66.209139 100,64 C100,61.790861 98.209139,60 96,60 Z M40,44 C37.790861,44 36,45.790861 36,48 C36,50.209139 37.790861,52 40,52 C42.209139,52 44,50.209139 44,48 C44,45.790861 42.209139,44 40,44 Z M56,44 C53.790861,44 52,45.790861 52,48 C52,50.209139 53.790861,52 56,52 C58.209139,52 60,50.209139 60,48 C60,45.790861 58.209139,44 56,44 Z M72,44 C69.790861,44 68,45.790861 68,48 C68,50.209139 69.790861,52 72,52 C74.209139,52 76,50.209139 76,48 C76,45.790861 74.209139,44 72,44 Z M88,44 C85.790861,44 84,45.790861 84,48 C84,50.209139 85.790861,52 88,52 C90.209139,52 92,50.209139 92,48 C92,45.790861 90.209139,44 88,44 Z M48,28 C45.790861,28 44,29.790861 44,32 C44,34.209139 45.790861,36 48,36 C50.209139,36 52,34.209139 52,32 C52,29.790861 50.209139,28 48,28 Z M64,28 C61.790861,28 60,29.790861 60,32 C60,34.209139 61.790861,36 64,36 C66.209139,36 68,34.209139 68,32 C68,29.790861 66.209139,28 64,28 Z M80,28 C77.790861,28 76,29.790861 76,32 C76,34.209139 77.790861,36 80,36 C82.209139,36 84,34.209139 84,32 C84,29.790861 82.209139,28 80,28 Z\"/>\n    <rect width=\"24\" height=\"16\" x=\"18.059\" y=\"22.059\" fill=\"#000\" rx=\"8\" transform=\"rotate(-45 30.059 30.059)\"/>\n    <rect width=\"24\" height=\"16\" x=\"85.941\" y=\"89.941\" fill=\"#000\" rx=\"8\" transform=\"rotate(-45 97.941 97.941)\"/>\n    <rect width=\"24\" height=\"16\" x=\"18.059\" y=\"89.941\" fill=\"#000\" rx=\"8\" transform=\"rotate(-135 30.059 97.941)\"/>\n    <rect width=\"24\" height=\"16\" x=\"85.941\" y=\"22.059\" fill=\"#000\" rx=\"8\" transform=\"rotate(-135 97.941 30.059)\"/>\n  </g>\n</svg>";

    var _temp = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\" transform=\"translate(44 12)\">\n    <path fill=\"#D8D8D8\" d=\"M12.2687181,31 L28.3282884,31 L28.3282884,69.2158203 C36.1094295,79.0719401 37.3656144,87.6666667 32.0968431,95 C24,99.9775391 16,99.9775391 9.96875,95 C3.32291667,87.6666667 4.08957269,79.0719401 12.2687181,69.2158203 L12.2687181,31 Z\"/>\n    <path fill=\"#000\" d=\"M20,0 C26.627417,-1.21743675e-15 32,5.372583 32,12 L32.0005148,67.998922 C36.8580088,71.647771 40,77.4569598 40,84 C40,95.045695 31.045695,104 20,104 C8.954305,104 0,95.045695 0,84 C0,77.4565086 3.14242454,71.6469698 8.00049011,67.9981671 L8,12 C8,5.372583 13.372583,1.21743675e-15 20,0 Z M20,8 C17.790861,8 16,9.790861 16,12 L16,12 L16.0000801,72.6827945 C11.3392688,74.3301176 8,78.7750948 8,84 C8,90.627417 13.372583,96 20,96 C26.627417,96 32,90.627417 32,84 C32,78.7754669 28.6612069,74.3307507 24.0009157,72.6831465 L24,12 C24,9.790861 22.209139,8 20,8 Z\"/>\n  </g>\n</svg>";

    var _add = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M100.731805,74.9134286 C100.52114,82.2878258 92.8150375,88.5383739 82.4399146,90.3243182 C79.9051456,86.5422428 76.0677893,83.0021658 71.2526077,80.3330671 C70.3547896,79.8353984 69.449307,79.382605 68.5407418,78.974311 L68.8088694,78.9718518 L68.8088694,78.9718518 C76.8076509,78.8322325 79.0484887,75.9170616 84.7453491,75.1931464 C88.5412081,74.7107964 93.8700267,74.6175572 100.731805,74.9134286 Z M100.734186,74.413984 C100.737079,74.5797447 100.736181,74.7449825 100.731544,74.9096603 L100.742912,74.9139078 C95.3696689,72.6740094 90.0167867,71.6005999 84.6842656,71.6936794 C76.6854841,71.8332987 74.4446463,74.7484696 68.7477859,75.4723849 C65.2954552,75.9110817 60.5750775,76.0279106 54.5866528,75.8228715 L53.9160603,75.7985972 C53.8055889,75.7944401 53.7126642,75.8806249 53.7085071,75.9910963 C53.7053099,76.0760607 53.7561371,76.1537739 53.8352603,76.1848978 L53.9311199,76.2222298 C53.5544829,76.2566904 53.1827661,76.3005055 52.8164439,76.353636 C52.7732691,75.9893866 52.7479633,75.6221786 52.7414966,75.2516995 C52.5872774,66.4164894 63.2057876,59.0666074 76.4586028,58.8352786 C89.711418,58.6039499 100.579967,65.5787739 100.734186,74.413984 Z\"/>\n    <path fill=\"#000\" d=\"M58,13 C58.1657859,13 58.3309829,13.0037822 58.4955547,13.0112922 L58.5,13 C56.1666667,18.3333333 55,23.6666667 55,29 C55,37 57.8756189,39.2913732 58.5,45 C58.8783786,48.4594612 58.9128077,53.181159 58.6032874,59.1650932 L58.5673134,59.8351599 C58.5612289,59.9455419 58.6457788,60.0399566 58.7561608,60.046041 C58.8410565,60.0507206 58.9196449,60.0012575 58.952145,59.9226895 C59.0544554,59.6753569 59.1341692,59.4788223 59.1912863,59.3330856 C61.0637621,54.5553904 62,49.7776952 62,45 C62,37 59.1243811,34.7086268 58.5,29 C58.0839704,25.1963009 58.0837461,19.8666667 58.499327,13.0110972 C67.1049577,13.4073439 74,23.9958544 74,37 C74,50.254834 66.836556,61 58,61 C49.163444,61 42,50.254834 42,37 C42,23.745166 49.163444,13 58,13 Z\" transform=\"rotate(89 58 37)\"/>\n    <path fill=\"#000\" d=\"M62.7478269,71.3269824 C62.9136128,71.3269824 63.0788098,71.3307646 63.2433816,71.3382745 L63.2478269,71.3269824 C60.9144936,76.6603157 59.7478269,81.993649 59.7478269,87.3269824 C59.7478269,95.3269824 62.6234458,97.6183556 63.2478269,103.326982 C63.6262055,106.786444 63.6606346,111.508141 63.3511143,117.492076 L63.3151403,118.162142 C63.3090558,118.272524 63.3936057,118.366939 63.5039877,118.373023 C63.5888834,118.377703 63.6674718,118.32824 63.6999719,118.249672 C63.8022823,118.002339 63.8819961,117.805805 63.9391132,117.660068 C65.811589,112.882373 66.7478269,108.104678 66.7478269,103.326982 C66.7478269,95.3269824 63.8722079,93.0356091 63.2478269,87.3269824 C62.8317973,83.5232833 62.831573,78.1936491 63.2471539,71.3380796 C71.8527846,71.7343263 78.7478269,82.3228368 78.7478269,95.3269824 C78.7478269,108.581816 71.5843829,119.326982 62.7478269,119.326982 C53.9112709,119.326982 46.7478269,108.581816 46.7478269,95.3269824 C46.7478269,82.0721484 53.9112709,71.3269824 62.7478269,71.3269824 Z\" transform=\"rotate(-61 62.748 95.327)\"/>\n  </g>\n</svg>";

    var _place = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" fill-rule=\"nonzero\" d=\"M62.7701315,43.2301351 L65.7698649,43.2701315 L65.7498667,44.7699982 L65.496,63.771 L73.4958004,63.8782996 L63.7433339,82.7499556 L54.4974891,63.6249888 L62.496,63.731 L62.7501333,44.7300018 L62.7701315,43.2301351 Z\"/>\n    <rect width=\"80\" height=\"8\" x=\"24\" y=\"16\" fill=\"#000\" rx=\"4\"/>\n    <path fill=\"#000\" d=\"M82,16 C85.3137085,16 88,18.6862915 88,22 L88,97 C88,105.284271 81.2842712,112 73,112 L55,112 C46.7157288,112 40,105.284271 40,97 L40,22 C40,18.6862915 42.6862915,16 46,16 L82,16 Z M74,24 L54,24 C50.6862915,24 48,26.6862915 48,30 L48,30 L48,96 C48,100.418278 51.581722,104 56,104 L56,104 L72,104 C76.418278,104 80,100.418278 80,96 L80,96 L80,30 C80,26.6862915 77.3137085,24 74,24 L74,24 Z\"/>\n  </g>\n</svg>";

    var _pour = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M78.1419878 88C85.4442191 98.0544584 88.6896552 106.113747 87.8782961 112.177866 86.6612576 121.274045 70.8397566 121.274045 68.4056795 112.177866 66.7829615 106.113747 70.0283976 98.0544584 78.1419878 88zM62.1419878 48C69.4442191 58.0544584 72.6896552 66.1137471 71.8782961 72.1778661 70.6612576 81.2740446 54.8397566 81.2740446 52.4056795 72.1778661 50.7829615 66.1137471 54.0283976 58.0544584 62.1419878 48z\"/>\n    <path fill=\"#000\" d=\"M-7,96.48643 C7.05839977,94.5569643 15.0583998,89.223631 17,80.48643 C22.0875997,57.5922315 12.061763,39.3257763 17,16.48643 C20.3917331,9.81976331 25.7250664,6.48642998 33,6.48642998 L33,0.486429979 C20.8636602,-1.72577072 12.8636602,3.60756261 9,16.48643 C2.79549032,37.1681289 13,60.6876019 9,80.48643 C5.62890625,85.8197633 0.295572917,88.48643 -7,88.48643 L-7,96.48643 Z\" transform=\"rotate(44 13 48.243)\"/>\n  </g>\n</svg>";

    var _bloom = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path stroke=\"#000\" stroke-width=\"7\" d=\"M67.2645076,14.5195467 C65.399923,13.6180778 63.346466,13.5577232 61.533788,14.1888819 C59.7211099,14.8200406 58.1492108,16.1427126 57.2477419,18.0072972 L51.5496914,29.7930584 L39.6089903,24.4272777 C38.0664171,23.7340932 36.334844,23.5826002 34.6953357,23.9973887 C32.6875279,24.5053553 31.0756934,25.7790577 30.0928024,27.4277203 C29.1099114,29.0763829 28.7559641,31.1000058 29.2639307,33.1078135 L32.4747121,45.7988665 L19.878547,49.3637748 C18.2512969,49.8243116 16.8274571,50.821295 15.8381418,52.192897 C14.6265865,53.872616 14.2105697,55.8843959 14.5173714,57.7791348 C14.8241732,59.6738738 15.8537935,61.4515719 17.5335124,62.6631271 L28.1507653,70.3211873 L20.7930219,81.1487243 C19.8425034,82.5474922 19.3926274,84.2264523 19.5164167,85.9130801 C19.668014,87.9785922 20.6424738,89.7871154 22.0954123,91.0413613 C23.5483508,92.2956072 25.479768,92.9955758 27.5452801,92.8439785 L40.6010738,91.8857543 L41.9245221,104.909595 C42.0954932,106.592095 42.830083,108.167428 44.0090545,109.379889 C45.4528704,110.864719 47.3618463,111.623757 49.2810755,111.650634 C51.2003047,111.677512 53.1297872,110.972228 54.6146163,109.528412 L64,100.402267 L73.3853837,109.528412 C74.5978453,110.707383 76.1731781,111.441973 77.855678,111.612944 C79.9161349,111.822322 81.8663958,111.176714 83.353887,109.963646 C84.8413782,108.750578 85.8660998,106.970052 86.0754779,104.909595 L87.3989262,91.8857543 L100.45472,92.8439785 C102.141348,92.9677678 103.820308,92.5178917 105.219076,91.5673732 C106.932063,90.40333 108.01106,88.6551614 108.3708,86.7697568 C108.730539,84.8843522 108.371021,82.8617116 107.206978,81.1487243 L99.8492347,70.3211873 L110.466488,62.6631271 C111.83809,61.6738118 112.835073,60.249972 113.29561,58.6227219 C113.859602,56.6299261 113.56246,54.5971852 112.626122,52.9216454 C111.689784,51.2461055 110.114249,49.9277667 108.121453,49.3637748 L95.5252879,45.7988665 L98.7360693,33.1078135 C99.1508578,31.4683052 98.9993648,29.736732 98.3061802,28.1941588 C97.4572786,26.3050617 95.9230345,24.9388906 94.1287415,24.2572192 C92.3344486,23.5755478 90.2801068,23.5783761 88.3910097,24.4272777 L76.4503086,29.7930584 L70.7522581,18.0072972 C70.0161489,16.4847401 68.7870648,15.2556559 67.2645076,14.5195467 Z\"/>\n    <circle cx=\"64\" cy=\"64\" r=\"22\" stroke=\"#000\" stroke-width=\"4\"/>\n  </g>\n</svg>";

    var _stir = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <rect width=\"8\" height=\"88\" x=\"60\" y=\"4\" fill=\"#000\" rx=\"4\"/>\n    <rect width=\"24\" height=\"40\" x=\"52\" y=\"84\" fill=\"#000\" rx=\"12\"/>\n    <path fill=\"#000\" fill-rule=\"nonzero\" d=\"M104.888816,36.7022543 C105.556146,37.1931337 105.699187,38.1320477 105.208307,38.7993774 C104.717428,39.466707 103.778514,39.6097482 103.111184,39.1188687 C98.1096225,35.4397819 84.9820583,33.5 64,33.5 C49.1293551,33.5 35.1110215,35.479924 24.460417,38.8067759 C15.0890756,41.7340337 9.5,45.4457916 9.5,48 C9.5,50.5611613 14.9178276,54.149281 24.1728982,56.959668 C34.6939016,60.154467 48.7475454,62.0399077 64,62.0399077 C78.415249,62.0399077 91.4975531,59.824803 103.254535,55.3998482 L99.703516,48.4209274 L120.945649,48.2732905 L108.318479,65.3555788 L104.622246,58.0899188 C92.4347505,62.7250412 78.891396,65.0399077 64,65.0399077 C32.8408248,65.0399077 6.5,57.041275 6.5,48 C6.5,38.9551783 33.5684608,30.5 64,30.5 C85.6377334,30.5 99.1768358,32.5005924 104.888816,36.7022543 Z\"/>\n  </g>\n</svg>";

    var _wait = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M64,8 C94.927946,8 120,33.072054 120,64 C120,94.927946 94.927946,120 64,120 C33.072054,120 8,94.927946 8,64 C8,33.072054 33.072054,8 64,8 Z M64,16 C37.490332,16 16,37.490332 16,64 C16,90.509668 37.490332,112 64,112 C90.509668,112 112,90.509668 112,64 C112,37.490332 90.509668,16 64,16 Z\"/>\n    <rect width=\"8\" height=\"48\" x=\"60\" y=\"21\" fill=\"#000\" rx=\"4\"/>\n    <rect width=\"32\" height=\"9\" x=\"60\" y=\"60\" fill=\"#000\" rx=\"4.5\"/>\n  </g>\n</svg>";

    var _press = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <rect width=\"80\" height=\"8\" x=\"24\" y=\"24\" fill=\"#000\" rx=\"4\"/>\n    <path fill=\"#000\" d=\"M82,24 C85.3137085,24 88,26.6862915 88,30 L88,105 C88,113.284271 81.2842712,120 73,120 L55,120 C46.7157288,120 40,113.284271 40,105 L40,30 C40,26.6862915 42.6862915,24 46,24 L82,24 Z M74,32 L54,32 C50.6862915,32 48,34.6862915 48,38 L48,38 L48,104 C48,108.418278 51.581722,112 56,112 L56,112 L72,112 C76.418278,112 80,108.418278 80,104 L80,104 L80,38 C80,34.6862915 77.3137085,32 74,32 L74,32 Z\"/>\n    <path fill=\"#000\" fill-rule=\"nonzero\" d=\"M66,8 L66,77 L74,77 L64.5,96 L55,77 L63,77 L63,8 L66,8 Z\"/>\n    <rect width=\"8\" height=\"64\" x=\"24\" y=\"56\" fill=\"#000\" rx=\"4\"/>\n    <rect width=\"8\" height=\"64\" x=\"96\" y=\"56\" fill=\"#000\" rx=\"4\"/>\n  </g>\n</svg>";

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
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (21:0) {#each systems as item}
    function create_each_block(ctx) {
    	let div2;
    	let a;
    	let div0;
    	let raw_value = /*item*/ ctx[3].icon + "";
    	let t0;
    	let div1;
    	let t1_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[3].name) + "";
    	let t1;
    	let a_href_value;
    	let a_title_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			a = element("a");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(t1_value);
    			attr_dev(div0, "class", "system-icon svelte-16xmapw");
    			add_location(div0, file, 23, 6, 676);
    			attr_dev(div1, "class", "system-name svelte-16xmapw");
    			add_location(div1, file, 26, 6, 747);
    			attr_dev(a, "class", "system-button bh svelte-16xmapw");
    			attr_dev(a, "href", a_href_value = "#/" + /*item*/ ctx[3].url);
    			attr_dev(a, "title", a_title_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[3].name));
    			add_location(a, file, 22, 4, 584);
    			attr_dev(div2, "class", "item svelte-16xmapw");
    			add_location(div2, file, 21, 2, 561);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, a);
    			append_dev(a, div0);
    			div0.innerHTML = raw_value;
    			append_dev(a, t0);
    			append_dev(a, div1);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 1 && t1_value !== (t1_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[3].name) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*$translations*/ 1 && a_title_value !== (a_title_value = tt(/*$translations*/ ctx[0], /*item*/ ctx[3].name))) {
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
    		source: "(21:0) {#each systems as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let t0;
    	let div;
    	let t1_value = /*$translations*/ ctx[0].language + "";
    	let t1;
    	let dispose;
    	let each_value = /*systems*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div = element("div");
    			t1 = text(t1_value);
    			attr_dev(div, "class", "lang bh svelte-16xmapw");
    			add_location(div, file, 31, 0, 836);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t1);
    			if (remount) dispose();
    			dispose = listen_dev(div, "click", /*toggleLang*/ ctx[2], false, false, false);
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
    						each_blocks[i].m(t0.parentNode, t0);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*$translations*/ 1 && t1_value !== (t1_value = /*$translations*/ ctx[0].language + "")) set_data_dev(t1, t1_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div);
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

    	function toggleLang() {
    		if ($translations.language === "en") {
    			setLanguage("ru");
    		} else {
    			setLanguage("en");
    		}
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
    		toggleLang,
    		$translations
    	});

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
    	let a_href_value;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a = element("a");
    			t = text("❮");
    			attr_dev(a, "class", "back-button b bh svelte-25fidq");
    			attr_dev(a, "href", a_href_value = `#${/*href*/ ctx[0]}`);
    			add_location(a, file$2, 15, 2, 298);
    			attr_dev(div, "class", "back svelte-25fidq");
    			add_location(div, file$2, 14, 0, 277);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a);
    			append_dev(a, t);
    			if (remount) dispose();
    			dispose = listen_dev(a, "click", /*callback*/ ctx[1], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*href*/ 1 && a_href_value !== (a_href_value = `#${/*href*/ ctx[0]}`)) {
    				attr_dev(a, "href", a_href_value);
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
    	let { beforeCallback } = $$props;

    	function callback(e) {
    		e.preventDefault();

    		if (beforeCallback && typeof beforeCallback === "function") {
    			beforeCallback();
    		}

    		push(href);
    	}

    	const writable_props = ["href", "beforeCallback"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Back> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Back", $$slots, []);

    	$$self.$set = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("beforeCallback" in $$props) $$invalidate(2, beforeCallback = $$props.beforeCallback);
    	};

    	$$self.$capture_state = () => ({ push, href, beforeCallback, callback });

    	$$self.$inject_state = $$props => {
    		if ("href" in $$props) $$invalidate(0, href = $$props.href);
    		if ("beforeCallback" in $$props) $$invalidate(2, beforeCallback = $$props.beforeCallback);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [href, callback, beforeCallback];
    }

    class Back extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { href: 0, beforeCallback: 2 });

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

    		if (/*beforeCallback*/ ctx[2] === undefined && !("beforeCallback" in props)) {
    			console.warn("<Back> was created without expected prop 'beforeCallback'");
    		}
    	}

    	get href() {
    		throw new Error("<Back>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Back>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get beforeCallback() {
    		throw new Error("<Back>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set beforeCallback(value) {
    		throw new Error("<Back>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
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

    var time = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"72\" height=\"72\" viewBox=\"0 0 72 72\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M36,0 C55.882251,0 72,16.117749 72,36 C72,55.882251 55.882251,72 36,72 C16.117749,72 0,55.882251 0,36 C0,16.117749 16.117749,0 36,0 Z M36,7 C19.9837423,7 7,19.9837423 7,36 C7,52.0162577 19.9837423,65 36,65 C52.0162577,65 65,52.0162577 65,36 C65,19.9837423 52.0162577,7 36,7 Z\"/>\n    <rect width=\"8\" height=\"32\" x=\"32\" y=\"8\" fill=\"#000\" rx=\"4\"/>\n    <rect width=\"24\" height=\"8\" x=\"32\" y=\"32\" fill=\"#000\" rx=\"4\"/>\n  </g>\n</svg>";

    var coffee = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"72\" height=\"72\" viewBox=\"0 0 72 72\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M68.983978,25.4970078 C68.7733135,32.8714049 61.0672106,39.121953 50.6920877,40.9078974 C48.1573187,37.125822 44.3199624,33.5857449 39.5047808,30.9166462 C38.6069628,30.4189775 37.7014801,29.9661841 36.7929149,29.5578901 L37.0610425,29.5554309 L37.0610425,29.5554309 C45.059824,29.4158117 47.3006618,26.5006407 52.9975222,25.7767255 C56.7933812,25.2943756 62.1221998,25.2011363 68.983978,25.4970078 Z M68.9863591,24.9975631 C68.9892524,25.1633238 68.9883539,25.3285616 68.9837173,25.4932394 L68.9950853,25.497487 C63.621842,23.2575885 58.2689598,22.184179 52.9364387,22.2772585 C44.9376572,22.4168778 42.6968194,25.3320487 36.999959,26.055964 C33.5476283,26.4946608 28.8272506,26.6114897 22.8388259,26.4064506 L22.1682334,26.3821763 C22.057762,26.3780193 21.9648373,26.464204 21.9606802,26.5746754 C21.957483,26.6596399 22.0083102,26.737353 22.0874334,26.7684769 L22.183293,26.8058089 C21.806656,26.8402696 21.4349392,26.8840846 21.068617,26.9372151 C21.0254422,26.5729657 21.0001364,26.2057577 20.9936697,25.8352786 C20.8394505,17.0000685 31.4579607,9.6501865 44.7107759,9.41885775 C57.9635911,9.187529 68.8321399,16.162353 68.9863591,24.9975631 Z\"/>\n    <path fill=\"#000\" d=\"M31,21.9105615 C31.1657859,21.9105615 31.3309829,21.9143437 31.4955547,21.9218537 L31.5,21.9105615 C29.1666667,27.2438948 28,32.5772282 28,37.9105615 C28,45.9105615 30.8756189,48.2019347 31.5,53.9105615 C31.8783786,57.3700227 31.9128077,62.0917205 31.6032874,68.0756547 L31.5673134,68.7457214 C31.5612289,68.8561034 31.6457788,68.9505181 31.7561608,68.9566025 C31.8410565,68.9612821 31.9196449,68.911819 31.952145,68.833251 C32.0544554,68.5859184 32.1341692,68.3893838 32.1912863,68.2436471 C34.0637621,63.4659519 35,58.6882567 35,53.9105615 C35,45.9105615 32.1243811,43.6191883 31.5,37.9105615 C31.0839704,34.1068625 31.0837461,28.7772282 31.499327,21.9216587 C40.1049577,22.3179054 47,32.9064159 47,45.9105615 C47,59.1653955 39.836556,69.9105615 31,69.9105615 C22.163444,69.9105615 15,59.1653955 15,45.9105615 C15,32.6557275 22.163444,21.9105615 31,21.9105615 Z\" transform=\"rotate(-61 31 45.91)\"/>\n  </g>\n</svg>";

    var grind = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"72\" height=\"72\" viewBox=\"0 0 72 72\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <circle cx=\"28\" cy=\"13\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"32\" cy=\"25\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"46\" cy=\"17\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"54\" cy=\"33\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"36\" cy=\"47\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"42\" cy=\"29\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"46\" cy=\"41\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"28\" cy=\"37\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"54\" cy=\"53\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"18\" cy=\"37\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"22\" cy=\"49\" r=\"4\" fill=\"#000\"/>\n    <circle cx=\"40\" cy=\"60\" r=\"4\" fill=\"#000\"/>\n  </g>\n</svg>";

    /* src/views/Recipes.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$2 } = globals;
    const file$3 = "src/views/Recipes.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[3] = list[i];
    	return child_ctx;
    }

    // (25:0) {:else}
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
    			add_location(div, file$3, 25, 0, 711);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div, null);
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*params, $recipes, getGrindLevel, $translations, grind, tt, coffee, toMSS, time, resolveSystemIcon*/ 7) {
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
    		source: "(25:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (23:30) 
    function create_if_block_1$1(ctx) {
    	let t_value = tt(/*$translations*/ ctx[2], "global.loading") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 4 && t_value !== (t_value = tt(/*$translations*/ ctx[2], "global.loading") + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(23:30) ",
    		ctx
    	});

    	return block;
    }

    // (21:0) {#if $recipes.error}
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
    		source: "(21:0) {#if $recipes.error}",
    		ctx
    	});

    	return block;
    }

    // (27:2) {#each $recipes[params.type] as recipe}
    function create_each_block$1(ctx) {
    	let a;
    	let div0;
    	let raw0_value = resolveSystemIcon(/*params*/ ctx[0].type) + "";
    	let t0;
    	let div7;
    	let div1;
    	let t1_value = /*recipe*/ ctx[3].title + "";
    	let t1;
    	let t2;
    	let div6;
    	let i0;
    	let div2;
    	let t3_value = toMSS(/*recipe*/ ctx[3].ingridients.time) + "";
    	let t3;
    	let t4;
    	let i1;
    	let div3;
    	let t5_value = /*recipe*/ ctx[3].ingridients.coffee + "";
    	let t5;
    	let t6_value = tt(/*$translations*/ ctx[2], "global.g") + "";
    	let t6;
    	let t7;
    	let i2;
    	let div4;
    	let t8_value = getGrindLevel(/*recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[2]) + "";
    	let t8;
    	let t9;
    	let i3;
    	let div5;
    	let t10_value = /*recipe*/ ctx[3].ingridients.temp + "";
    	let t10;
    	let t11;
    	let t12;
    	let a_href_value;
    	let link_action;
    	let dispose;

    	const block = {
    		c: function create() {
    			a = element("a");
    			div0 = element("div");
    			t0 = space();
    			div7 = element("div");
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div6 = element("div");
    			i0 = element("i");
    			div2 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			i1 = element("i");
    			div3 = element("div");
    			t5 = text(t5_value);
    			t6 = text(t6_value);
    			t7 = space();
    			i2 = element("i");
    			div4 = element("div");
    			t8 = text(t8_value);
    			t9 = space();
    			i3 = element("i");
    			div5 = element("div");
    			t10 = text(t10_value);
    			t11 = text("°");
    			t12 = space();
    			attr_dev(div0, "class", "recipe-icon svelte-1u9j7g");
    			add_location(div0, file$3, 28, 6, 856);
    			attr_dev(div1, "class", "recipe-name svelte-1u9j7g");
    			add_location(div1, file$3, 32, 10, 984);
    			attr_dev(i0, "class", "svelte-1u9j7g");
    			add_location(i0, file$3, 34, 12, 1085);
    			attr_dev(div2, "class", "ingridient-data svelte-1u9j7g");
    			add_location(div2, file$3, 34, 31, 1104);
    			attr_dev(i1, "class", "svelte-1u9j7g");
    			add_location(i1, file$3, 35, 12, 1184);
    			attr_dev(div3, "class", "ingridient-data svelte-1u9j7g");
    			add_location(div3, file$3, 35, 33, 1205);
    			attr_dev(i2, "class", "svelte-1u9j7g");
    			add_location(i2, file$3, 36, 12, 1311);
    			attr_dev(div4, "class", "ingridient-data svelte-1u9j7g");
    			add_location(div4, file$3, 36, 32, 1331);
    			attr_dev(i3, "class", "svelte-1u9j7g");
    			add_location(i3, file$3, 37, 12, 1435);
    			attr_dev(div5, "class", "ingridient-data svelte-1u9j7g");
    			add_location(div5, file$3, 37, 19, 1442);
    			attr_dev(div6, "class", "recipe-ingridients svelte-1u9j7g");
    			add_location(div6, file$3, 33, 10, 1040);
    			attr_dev(div7, "class", "recipe-data svelte-1u9j7g");
    			add_location(div7, file$3, 31, 6, 948);
    			attr_dev(a, "class", "recipe-button bh svelte-1u9j7g");
    			attr_dev(a, "href", a_href_value = "/" + /*params*/ ctx[0].type + "/" + /*recipe*/ ctx[3].name);
    			add_location(a, file$3, 27, 4, 776);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, a, anchor);
    			append_dev(a, div0);
    			div0.innerHTML = raw0_value;
    			append_dev(a, t0);
    			append_dev(a, div7);
    			append_dev(div7, div1);
    			append_dev(div1, t1);
    			append_dev(div7, t2);
    			append_dev(div7, div6);
    			append_dev(div6, i0);
    			i0.innerHTML = time;
    			append_dev(div6, div2);
    			append_dev(div2, t3);
    			append_dev(div6, t4);
    			append_dev(div6, i1);
    			i1.innerHTML = coffee;
    			append_dev(div6, div3);
    			append_dev(div3, t5);
    			append_dev(div3, t6);
    			append_dev(div6, t7);
    			append_dev(div6, i2);
    			i2.innerHTML = grind;
    			append_dev(div6, div4);
    			append_dev(div4, t8);
    			append_dev(div6, t9);
    			append_dev(div6, i3);
    			append_dev(div6, div5);
    			append_dev(div5, t10);
    			append_dev(div5, t11);
    			append_dev(a, t12);
    			if (remount) dispose();
    			dispose = action_destroyer(link_action = link.call(null, a));
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*params*/ 1 && raw0_value !== (raw0_value = resolveSystemIcon(/*params*/ ctx[0].type) + "")) div0.innerHTML = raw0_value;			if (dirty & /*$recipes, params*/ 3 && t1_value !== (t1_value = /*recipe*/ ctx[3].title + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$recipes, params*/ 3 && t3_value !== (t3_value = toMSS(/*recipe*/ ctx[3].ingridients.time) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$recipes, params*/ 3 && t5_value !== (t5_value = /*recipe*/ ctx[3].ingridients.coffee + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*$translations*/ 4 && t6_value !== (t6_value = tt(/*$translations*/ ctx[2], "global.g") + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*$recipes, params, $translations*/ 7 && t8_value !== (t8_value = getGrindLevel(/*recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[2]) + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*$recipes, params*/ 3 && t10_value !== (t10_value = /*recipe*/ ctx[3].ingridients.temp + "")) set_data_dev(t10, t10_value);

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
    		source: "(27:2) {#each $recipes[params.type] as recipe}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Recipes",
    			options,
    			id: create_fragment$4.name
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

    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 }) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * x}px, ${(1 - t) * y}px);
			opacity: ${target_opacity - (od * u)}`
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
      steps: [],
      ingridients: {},
      error: null,
      isFetching: false
    });

    const timer = writable({
      time: null,
      step: null,
    });

    const clearRecipe = () => {
      recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
    };

    const fetchCurrentRecipe = async (type, name) => {
      let currentRecipe = null;
      recipe.set({steps: [], ingridients: {}, error: null, isFetching: true});
      await fetchRecipes(type);
      currentRecipe = get_store_value(recipes)[type] ? get_store_value(recipes)[type].find((item) => item.name === name) : null;
      if (currentRecipe) {
        recipe.set({steps: currentRecipe.steps, ingridients: currentRecipe.ingridients, error: null, isFetching: false});
      } else {
        recipe.set({steps: [], ingridients: {}, error: {response: {status: 404, statusText: 'Not Found'}}, isFetching: false});
      }
    };

    const startTimer = (initialStep = 0, time) => {
      clearInterval(interval);
      const current = get_store_value(recipe);
      const stepNumber = initialStep;
      if (current.steps.length && current.steps[stepNumber]) {
        noSleep.enable();
        timer.set({time: time || current.steps[stepNumber].time, step: stepNumber});

        interval = setInterval(() => {
          const ct = get_store_value(timer);
          let nextTime = ct.time;
          if (nextTime > 0) {
            nextTime = nextTime - 1;
            if (nextTime < 4) {
              const tick = new Audio('/public/audio/tick.wav');
              tick.play();
            }
            timer.set({time: nextTime, step: ct.step});
            return;
          }
          if (ct.step >= current.steps.length - 1) {
            clearInterval(interval);
            timer.set({time: null, step: null, done: true});
            noSleep.disable();
            end.play();
          } else {
            timer.set({time: current.steps[ct.step+1].time, step: ct.step+1});
            stage.play();
          }
        }, 1000);
      } else {
        stopTimer();
      }
    };

    const stopTimer = () => {
      clearInterval(interval);
      timer.set({time: null, step: null});
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

    var water = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"72\" height=\"72\" viewBox=\"0 0 72 72\">\n  <path fill-rule=\"evenodd\" d=\"M36.7200811,12 C48.0385396,27.5681936 53.0689655,40.0470923 51.811359,49.4366959 C49.9249493,63.5211014 25.4016227,63.5211014 21.6288032,49.4366959 C19.1135903,40.0470923 24.1440162,27.5681936 36.7200811,12 Z\"/>\n</svg>";

    var play = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <path fill-rule=\"evenodd\" d=\"M85.3665631,26.7331263 L123.658359,103.316718 C125.140295,106.280589 123.938949,109.884628 120.975078,111.366563 C120.141945,111.783129 119.223267,112 118.291796,112 L41.7082039,112 C38.3944954,112 35.7082039,109.313708 35.7082039,106 C35.7082039,105.068529 35.9250745,104.149851 36.3416408,103.316718 L74.6334369,26.7331263 C76.1153723,23.7692553 79.7194106,22.5679092 82.6832816,24.0498447 C83.844446,24.6304269 84.7859809,25.5719619 85.3665631,26.7331263 Z\" transform=\"rotate(90 80 64)\"/>\n</svg>";

    var stop = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <rect width=\"96\" height=\"96\" x=\"16\" y=\"16\" fill-rule=\"evenodd\" rx=\"8\"/>\n</svg>";

    var next = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <path fill=\"#000\" d=\"M57.3665631,42.7331263 L79.6583592,87.3167184 C81.1402947,90.2805894 79.9389486,93.8846277 76.9750776,95.3665631 C76.141945,95.7831294 75.2232666,96 74.2917961,96 L29.7082039,96 C26.3944954,96 23.7082039,93.3137085 23.7082039,90 C23.7082039,89.0685294 23.9250745,88.149851 24.3416408,87.3167184 L46.6334369,42.7331263 C48.1153723,39.7692553 51.7194106,38.5679092 54.6832816,40.0498447 C55.844446,40.6304269 56.7859809,41.5719619 57.3665631,42.7331263 Z\" transform=\"rotate(90 52 64)\"/>\n    <path fill=\"#000\" d=\"M97.3665631,42.7331263 L119.658359,87.3167184 C121.140295,90.2805894 119.938949,93.8846277 116.975078,95.3665631 C116.141945,95.7831294 115.223267,96 114.291796,96 L69.7082039,96 C66.3944954,96 63.7082039,93.3137085 63.7082039,90 C63.7082039,89.0685294 63.9250745,88.149851 64.3416408,87.3167184 L86.6334369,42.7331263 C88.1153723,39.7692553 91.7194106,38.5679092 94.6832816,40.0498447 C95.844446,40.6304269 96.7859809,41.5719619 97.3665631,42.7331263 Z\" transform=\"rotate(90 92 64)\"/>\n  </g>\n</svg>";

    var pause = "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"128\" height=\"128\" viewBox=\"0 0 128 128\">\n  <g fill=\"none\" fill-rule=\"evenodd\">\n    <rect width=\"24\" height=\"95\" x=\"32\" y=\"16\" fill=\"#000\" rx=\"8\"/>\n    <rect width=\"24\" height=\"95\" x=\"72\" y=\"16\" fill=\"#000\" rx=\"8\"/>\n  </g>\n</svg>";

    /* src/views/Timer.svelte generated by Svelte v3.22.2 */

    const { Error: Error_1$3 } = globals;
    const file$4 = "src/views/Timer.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (57:30) 
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
    	let div8;
    	let t13;
    	let t14;
    	let div7;
    	let t15;
    	let div6;
    	let t16;
    	let div9;
    	let dispose;
    	let if_block0 = /*$timer*/ ctx[2].step !== null && /*$timer*/ ctx[2].step < /*$recipe*/ ctx[3].steps.length - 1 && create_if_block_11(ctx);
    	let if_block1 = /*$timer*/ ctx[2].step !== null && create_if_block_10(ctx);
    	let if_block2 = /*$timer*/ ctx[2].step !== null && create_if_block_8(ctx);

    	function select_block_type_2(ctx, dirty) {
    		if (/*$timer*/ ctx[2].time) return create_if_block_5;
    		if (/*$timer*/ ctx[2].done) return create_if_block_6;
    		if (/*$timer*/ ctx[2].time === 0) return create_if_block_7;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block3 = current_block_type(ctx);
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
    			div8 = element("div");
    			if (if_block0) if_block0.c();
    			t13 = space();
    			if (if_block1) if_block1.c();
    			t14 = space();
    			div7 = element("div");
    			if (if_block2) if_block2.c();
    			t15 = space();
    			div6 = element("div");
    			if_block3.c();
    			t16 = space();
    			div9 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(i0, "class", "svelte-2u5ddr");
    			add_location(i0, file$4, 58, 44, 1665);
    			attr_dev(div0, "class", "recipe-pad b recipe-coffee svelte-2u5ddr");
    			add_location(div0, file$4, 58, 4, 1625);
    			attr_dev(i1, "class", "svelte-2u5ddr");
    			add_location(i1, file$4, 59, 43, 1795);
    			attr_dev(div1, "class", "recipe-pad b recipe-water svelte-2u5ddr");
    			add_location(div1, file$4, 59, 4, 1756);
    			attr_dev(i2, "class", "svelte-2u5ddr");
    			add_location(i2, file$4, 60, 43, 1924);
    			add_location(span, file$4, 60, 63, 1944);
    			attr_dev(div2, "class", "recipe-pad b recipe-grind svelte-2u5ddr");
    			add_location(div2, file$4, 60, 4, 1885);
    			attr_dev(div3, "class", "recipe-pad b recipe-temp svelte-2u5ddr");
    			add_location(div3, file$4, 61, 4, 2025);
    			attr_dev(i3, "class", "svelte-2u5ddr");
    			add_location(i3, file$4, 62, 42, 2139);
    			attr_dev(div4, "class", "recipe-pad b recipe-time svelte-2u5ddr");
    			add_location(div4, file$4, 62, 4, 2101);
    			attr_dev(div5, "class", "recipe-info svelte-2u5ddr");
    			add_location(div5, file$4, 57, 2, 1595);
    			attr_dev(div6, "class", "timer-content svelte-2u5ddr");
    			add_location(div6, file$4, 90, 6, 3084);
    			attr_dev(div7, "class", "timer svelte-2u5ddr");
    			add_location(div7, file$4, 75, 4, 2608);
    			attr_dev(div8, "class", "timer-wrapper svelte-2u5ddr");
    			add_location(div8, file$4, 64, 2, 2209);
    			attr_dev(div9, "class", "steps svelte-2u5ddr");
    			add_location(div9, file$4, 103, 2, 3446);
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
    			insert_dev(target, t12, anchor);
    			insert_dev(target, div8, anchor);
    			if (if_block0) if_block0.m(div8, null);
    			append_dev(div8, t13);
    			if (if_block1) if_block1.m(div8, null);
    			append_dev(div8, t14);
    			append_dev(div8, div7);
    			if (if_block2) if_block2.m(div7, null);
    			append_dev(div7, t15);
    			append_dev(div7, div6);
    			if_block3.m(div6, null);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, div9, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div9, null);
    			}

    			if (remount) dispose();
    			dispose = listen_dev(div7, "click", /*toggleTime*/ ctx[6], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$recipe*/ 8 && t0_value !== (t0_value = /*$recipe*/ ctx[3].ingridients.coffee + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$translations*/ 16 && t1_value !== (t1_value = tt(/*$translations*/ ctx[4], "global.g") + "")) set_data_dev(t1, t1_value);
    			if (dirty & /*$recipe*/ 8 && t3_value !== (t3_value = /*$recipe*/ ctx[3].ingridients.water + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$translations*/ 16 && t4_value !== (t4_value = tt(/*$translations*/ ctx[4], "global.ml") + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*$recipe, $translations*/ 24 && t6_value !== (t6_value = getGrindLevel(/*$recipe*/ ctx[3].ingridients.grind, /*$translations*/ ctx[4]) + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*$recipe*/ 8 && t8_value !== (t8_value = /*$recipe*/ ctx[3].ingridients.temp + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*$recipe*/ 8 && t11_value !== (t11_value = toMSS(/*$recipe*/ ctx[3].ingridients.time) + "")) set_data_dev(t11, t11_value);

    			if (/*$timer*/ ctx[2].step !== null && /*$timer*/ ctx[2].step < /*$recipe*/ ctx[3].steps.length - 1) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);

    					if (dirty & /*$timer, $recipe*/ 12) {
    						transition_in(if_block0, 1);
    					}
    				} else {
    					if_block0 = create_if_block_11(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(div8, t13);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*$timer*/ ctx[2].step !== null) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty & /*$timer*/ 4) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block_10(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(div8, t14);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*$timer*/ ctx[2].step !== null) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_8(ctx);
    					if_block2.c();
    					if_block2.m(div7, t15);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block3) {
    				if_block3.p(ctx, dirty);
    			} else {
    				if_block3.d(1);
    				if_block3 = current_block_type(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(div6, null);
    				}
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
    						each_blocks[i].m(div9, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block0);
    			transition_in(if_block1);
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(div8);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if_block3.d();
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(div9);
    			destroy_each(each_blocks, detaching);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(57:30) ",
    		ctx
    	});

    	return block;
    }

    // (55:29) 
    function create_if_block_1$2(ctx) {
    	let t_value = tt(/*$translations*/ ctx[4], "global.loading") + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$translations*/ 16 && t_value !== (t_value = tt(/*$translations*/ ctx[4], "global.loading") + "")) set_data_dev(t, t_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(55:29) ",
    		ctx
    	});

    	return block;
    }

    // (53:0) {#if $recipe.error}
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
    		source: "(53:0) {#if $recipe.error}",
    		ctx
    	});

    	return block;
    }

    // (66:3) {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}
    function create_if_block_11(ctx) {
    	let div;
    	let i;
    	let div_transition;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "svelte-2u5ddr");
    			add_location(i, file$4, 67, 8, 2399);
    			attr_dev(div, "class", "actions bh next-step svelte-2u5ddr");
    			add_location(div, file$4, 66, 6, 2313);
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
    		id: create_if_block_11.name,
    		type: "if",
    		source: "(66:3) {#if $timer.step !== null && $timer.step < $recipe.steps.length-1}",
    		ctx
    	});

    	return block;
    }

    // (71:4) {#if $timer.step !== null}
    function create_if_block_10(ctx) {
    	let div;
    	let i;
    	let div_transition;
    	let current;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			i = element("i");
    			attr_dev(i, "class", "svelte-2u5ddr");
    			add_location(i, file$4, 72, 8, 2561);
    			attr_dev(div, "class", "actions bh stop svelte-2u5ddr");
    			add_location(div, file$4, 71, 6, 2479);
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
    		id: create_if_block_10.name,
    		type: "if",
    		source: "(71:4) {#if $timer.step !== null}",
    		ctx
    	});

    	return block;
    }

    // (77:6) {#if $timer.step !== null }
    function create_if_block_8(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	const if_block_creators = [create_if_block_9, create_else_block_1];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*pausedTime*/ ctx[1]) return 0;
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
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(77:6) {#if $timer.step !== null }",
    		ctx
    	});

    	return block;
    }

    // (85:8) {:else}
    function create_else_block_1(ctx) {
    	let div;
    	let div_transition;
    	let current;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "stop-timer svelte-2u5ddr");
    			add_location(div, file$4, 85, 10, 2961);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			div.innerHTML = pause;
    			current = true;
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
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(85:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (78:8) {#if pausedTime}
    function create_if_block_9(ctx) {
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
    			attr_dev(div0, "class", "paused-timer svelte-2u5ddr");
    			add_location(div0, file$4, 78, 10, 2719);
    			attr_dev(div1, "class", "stop-timer svelte-2u5ddr");
    			add_location(div1, file$4, 81, 10, 2845);
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
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(78:8) {#if pausedTime}",
    		ctx
    	});

    	return block;
    }

    // (98:8) {:else}
    function create_else_block$3(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "timer-button svelte-2u5ddr");
    			add_location(div, file$4, 98, 10, 3352);
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
    		source: "(98:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (96:37) 
    function create_if_block_7(ctx) {
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
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(96:37) ",
    		ctx
    	});

    	return block;
    }

    // (94:31) 
    function create_if_block_6(ctx) {
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
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(94:31) ",
    		ctx
    	});

    	return block;
    }

    // (92:8) {#if $timer.time}
    function create_if_block_5(ctx) {
    	let div;
    	let t_value = toMSS(/*$timer*/ ctx[2].time) + "";
    	let t;

    	const block = {
    		c: function create() {
    			div = element("div");
    			t = text(t_value);
    			attr_dev(div, "class", "counter svelte-2u5ddr");
    			add_location(div, file$4, 92, 10, 3148);
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
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(92:8) {#if $timer.time}",
    		ctx
    	});

    	return block;
    }

    // (106:6) {#if index >= $timer.step}
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
    	let if_block = /*step*/ ctx[8].amount && create_if_block_4(ctx);

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
    			attr_dev(div0, "class", "step-icon svelte-2u5ddr");
    			add_location(div0, file$4, 108, 12, 3670);
    			attr_dev(div1, "class", "step-type svelte-2u5ddr");
    			add_location(div1, file$4, 107, 10, 3634);
    			attr_dev(div2, "class", "step-icon svelte-2u5ddr");
    			add_location(div2, file$4, 115, 12, 3983);
    			attr_dev(div3, "class", "step-time svelte-2u5ddr");
    			add_location(div3, file$4, 114, 10, 3947);
    			attr_dev(div4, "class", "step b svelte-2u5ddr");
    			toggle_class(div4, "active", /*$timer*/ ctx[2].step === /*index*/ ctx[10]);
    			add_location(div4, file$4, 106, 8, 3548);
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

    			if (/*step*/ ctx[8].amount) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_4(ctx);
    					if_block.c();
    					if_block.m(div4, t3);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
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
    			if (if_block) if_block.d();
    			if (detaching && div4_outro) div4_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(106:6) {#if index >= $timer.step}",
    		ctx
    	});

    	return block;
    }

    // (112:10) {#if step.amount}
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
    			attr_dev(div, "class", "step-amount svelte-2u5ddr");
    			add_location(div, file$4, 112, 12, 3844);
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
    		source: "(112:10) {#if step.amount}",
    		ctx
    	});

    	return block;
    }

    // (105:4) {#each $recipe.steps as step, index}
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
    		source: "(105:4) {#each $recipe.steps as step, index}",
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

    	const back = new Back({
    			props: {
    				href: "/" + /*params*/ ctx[0].type,
    				beforeCallback: /*func*/ ctx[7]
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block$3, create_if_block_1$2, create_if_block_2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$recipe*/ ctx[3].error) return 0;
    		if (/*$recipe*/ ctx[3].isFetching) return 1;
    		if (/*$recipe*/ ctx[3].ingridients) return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			create_component(back.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error_1$3("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(back, target, anchor);
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
    			destroy_component(back, detaching);
    			if (detaching) detach_dev(t);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

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
    			if (pausedTime) {
    				startTimer($timer.step, pausedTime);
    				$$invalidate(1, pausedTime = false);
    			} else {
    				$$invalidate(1, pausedTime = pauseTimer());
    			}
    		} else {
    			startTimer();
    			$$invalidate(1, pausedTime = false);
    		}
    	}

    	const writable_props = ["params"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Timer> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Timer", $$slots, []);

    	const func = () => {
    		destroyTimer();
    	};

    	$$self.$set = $$props => {
    		if ("params" in $$props) $$invalidate(0, params = $$props.params);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		scale,
    		fly,
    		Error: Error$1,
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

    	return [params, pausedTime, $timer, $recipe, $translations, goToNext, toggleTime, func];
    }

    class Timer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { params: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Timer",
    			options,
    			id: create_fragment$5.name
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

    function create_fragment$6(ctx) {
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
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NotFound",
    			options,
    			id: create_fragment$6.name
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
    const file$5 = "src/App.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let current;
    	const router = new Router({ props: { routes }, $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(router.$$.fragment);
    			attr_dev(div, "class", "page svelte-1w4h5f0");
    			add_location(div, file$5, 5, 1, 93);
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
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
