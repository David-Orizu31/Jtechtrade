/**
 * Kefu v1.0.7
 * FastAdminåœ¨çº¿å®¢æœç³»ç»Ÿ
 * https://www.fastadmin.net/store/kefu.html
 *
 * Copyright 2020 ç™½è¡£ç´ è¢–
 *
 * FastAdminåœ¨çº¿å®¢æœç³»ç»Ÿä¸æ˜¯å¼€æºäº§å“ï¼Œæ‰€æœ‰æ–‡å­—ã€å›¾ç‰‡ã€æ ·å¼ã€é£Žæ ¼ç­‰ç‰ˆæƒå½’åœ¨çº¿å®¢æœä½œè€…æ‰€æœ‰ï¼Œå¦‚æœ‰å¤åˆ¶ã€ä»¿å†’ã€æŠ„è¢­ã€ç›—ç”¨ï¼ŒFastAdminå’Œåœ¨çº¿å®¢æœä½œè€…å°†è¿½ç©¶æ³•å¾‹è´£ä»»
 *
 * Released on: November 6, 2020
 */
// éŸ³é¢‘æ’­æ”¾åˆå§‹åŒ–
window.AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext || window.msAudioContext;

var KeFu = {
    ws: {
        SocketTask: null,
        Timer: null,
        ErrorMsg: [],
        MaxRetryCount: 3,// æœ€å¤§é‡è¿žæ¬¡æ•°
        CurrentRetryCount: 0,
        url: null
    },
    audio: {
        context: new window.AudioContext(),
        source: null,
        buffer: null
    },
    config: null,
    url: null,
    fixed_csr: 0,
    window_is_show: false,
    fast_move: false,
    csr: "",// å½“å‰ç”¨æˆ·çš„å®¢æœä»£è¡¨ID
    session_id: 0,
    last_sender: null,
    token_list: [],
    fast_reply: [],// å¿«æ·å›žå¤å¯Œæ–‡æœ¬æ”¯æŒ
    session_user: "",
    select_session_user: "",// å³é”®èœå•é€‰ä¸­çš„ session_user
    slider: null,// å¹»ç¯ç‰‡å¯¹è±¡
    clickkefu_button: false,// é˜²æ­¢æµ®åŠ¨æŒ‰é’®è¢«æ‹–åŠ¨æ—¶è§¦å‘ç‚¹å‡»äº‹ä»¶
    allowed_close_window: true,// æ˜¯å¦å…è®¸ecså…³é—­çª—å£ï¼ˆå½“é¢„è§ˆå›¾ç‰‡æ—¶ï¼Œä¸å…è®¸å…³é—­ï¼‰
    record_scroll_height: 0,// èŠå¤©è®°å½•çª—å£çš„æ»šåŠ¨æ¡é«˜åº¦
    resize_load: 0,
    group_show: {
        'dialogue': false,
        'invitation': false,
        'recently': false
    }, // åˆ†ç»„æ˜¯å¦å±•å¼€,æœªå±•å¼€æ—¶æ·»åŠ çº¢ç‚¹
    initialize: function (url = document.domain, modulename = 'index', initSuccess = null, fixed_csr = 0) {

        KeFu.url = url;
        KeFu.fixed_csr = fixed_csr;
        var initialize_url = KeFu.buildUrl(url, modulename, 'initialize');
        $.ajax({
            url: initialize_url,
            success: function (data) {
                if (data.code == 401) {
                    console.warn(data.msg);
                    return;
                } else if (data.code != 1) {
                    layer.msg(data.msg);
                    return;
                }

                KeFu.config = data.data.config;
                KeFu.config.user_id = data.data.user_info.user_id;
                KeFu.token_list = data.data.token_list;
                if (KeFu.token_list.kefu_tourists_token) {
                    localStorage.setItem('kefu_tourists_token', KeFu.token_list.kefu_tourists_token);
                }
                KeFu.fast_reply = data.data.fast_reply;
                KeFu.bulidChat(data.data.window_html);

                if (parseInt(KeFu.config.auto_invitation_switch) > 0 && KeFu.config.modulename != 'admin') {

                    let only_first_invitation = parseInt(KeFu.config.only_first_invitation);

                    // kefu_auto_invitation åœ¨çª—å£æˆåŠŸå¼¹å‡ºåŽåˆ›å»º
                    if ((only_first_invitation == 1 && !localStorage.getItem('kefu_auto_invitation')) || only_first_invitation == 0) {

                        setTimeout(function () {
                            KeFu.bulidInviteBox();
                        }, (KeFu.config.auto_invitation_timing * 1000));
                    }

                }

                // æž„å»ºwså’Œæ–‡ä»¶ä¸Šä¼ çš„url
                KeFu.ws.url = KeFu.buildUrl(url, modulename, 'ws', KeFu.config.websocket_port);
                KeFu.config.upload.uploadurl = KeFu.buildUrl(url, modulename, "upload");

                if (modulename == 'admin') {
                    // ç«‹å³é“¾æŽ¥ Websocket
                    KeFu.ConnectSocket();
                } else {
                    // è‹¥ç”¨æˆ· 10 ç§’åŽä»»åœ¨æ­¤é¡µé¢ï¼Œé“¾æŽ¥Socket
                    setTimeout(function () {
                        if (!KeFu.ws.SocketTask || KeFu.ws.SocketTask.readyState == 3 || KeFu.ws.SocketTask.readyState == 2) {
                            KeFu.ConnectSocket();
                        }
                    }, 10000);
                }

                if (typeof initSuccess == 'function') {
                    initSuccess();
                }

                // è¯»å–æŒ‰é’®ä½ç½®
                var kefu_button_coordinate = localStorage.getItem("kefu_button_coordinate");
                if (kefu_button_coordinate) {
                    kefu_button_coordinate = kefu_button_coordinate.split(',');
                    if (kefu_button_coordinate[0] && kefu_button_coordinate[1] && $('body').width() > Number(kefu_button_coordinate[1])) {
                        $("#kefu_button").css({
                            "top": Number(kefu_button_coordinate[0]),
                            "left": Number(kefu_button_coordinate[1])
                        });
                    }
                }

                // æ–°æ¶ˆæ¯
                if (data.data.new_msg) {
                    KeFu.toggle_popover('show', data.data.new_msg);
                    KeFu.new_message_prompt('#kefu_button');
                } else if (!localStorage.getItem('kefu_new_user')) {
                    KeFu.toggle_popover('show', KeFu.config.new_user_tip);
                    KeFu.new_message_prompt('#kefu_button');
                }
                KeFu.eventReg();
            }
        });
    },
    ConnectSocket: function () {

        if ("WebSocket" in window) {
            var ws = new WebSocket(KeFu.ws.url);
            KeFu.ws.SocketTask = ws;

            ws.onopen = function () {

                // é‡æ–°å‘é€æ‰€æœ‰å‡ºé”™çš„æ¶ˆæ¯
                if (KeFu.ws.ErrorMsg.length > 0) {

                    for (let i in KeFu.ws.ErrorMsg) {
                        KeFu.ws_send(KeFu.ws.ErrorMsg[i]);
                    }

                    KeFu.ws.ErrorMsg = [];
                }

                if (KeFu.ws.Timer != null) {
                    clearInterval(KeFu.ws.Timer);
                }

                KeFu.ws.Timer = setInterval(KeFu.ws_send, 28000);//å®šæ—¶å‘é€å¿ƒè·³
            };

            ws.onmessage = function (evt) {
                var msg = $.parseJSON(evt.data);
                let action = KeFu.domsg[msg.msgtype] || KeFu.domsg['default']
                action.call(this, msg)
            };

            ws.onclose = function (e) {

                if (KeFu.ws.Timer != null) {
                    clearInterval(KeFu.ws.Timer);
                }

                KeFu.ws.ws_error = true;
                $('#kefu_error').html('The network link is down');
                KeFu.toggle_popover('show', 'WebSocket Link broken');
                if (KeFu.ws.MaxRetryCount) {
                    KeFu.ws.Timer = setInterval(KeFu.retry_webSocket, 3000);//æ¯3ç§’é‡æ–°è¿žæŽ¥ä¸€æ¬¡
                }
            };

            ws.onerror = function (e) {
                // é”™è¯¯
                KeFu.ws.ws_error = true;
                console.error('websocket error:', e);
                $('#kefu_error').html('WebSocket An error occurred');
                KeFu.toggle_popover('show', 'WebSocket An error occurred');
            };
        } else {
            KeFu.ws.ws_error = true;
            layer.msg(KeFu.config.chat_name + 'ï¼šYour browser does not support WebSocket!');
        }
    },
    retry_webSocket: function () {
        if (KeFu.ws.CurrentRetryCount < KeFu.ws.MaxRetryCount) {
            KeFu.ws.CurrentRetryCount++;
            KeFu.ConnectSocket();
            console.log('Reconnection WebSocket the' + KeFu.ws.CurrentRetryCount + 'time');
        } else {
            if (KeFu.ws.Timer != null) {
                clearInterval(KeFu.ws.Timer);
            }

            console.log('Will try to reconnect again every 10 seconds WebSocket')
            KeFu.ws.Timer = setInterval(KeFu.ConnectSocket, 10000);//æ¯10ç§’é‡æ–°è¿žæŽ¥ä¸€æ¬¡
        }
    },
    change_csr_status: function (status_id) {

        status_id = parseInt(status_id);

        const states = new Map([
            [0, ['Offline', '#777']],
            [1, ['busy', '#8a6d3b']],
            [2, ['leave', '#a94442']],
            [3, ['Online', '#3c763d']],
            ['default', ['unknown', '#777']],
        ])

        let state = states.get(status_id) || states.get('default');

        if (KeFu.config.modulename == 'admin') {
            $('#kefu_csr_status button .kefu_status').html(state[0]);
            $('#kefu_csr_status button').css('color', state[1]);
        } else {
            $('.modal-title #csr_status').html(' â€¢ ' + state[0]);
            $('.modal-title #csr_status').css('color', state[1]);
        }
    },
    // ä¼šè¯åˆ†ç»„çš„çº¢ç‚¹ç®¡ç†
    session_group_red_dot: function (group, red_dot) {
        var element_id = '#heading_' + group;
        if (red_dot) {
            $('.KeFu .modal-body .kefu-left ' + element_id + ' .panel-title .red_dot').fadeIn();
        } else {
            $('.KeFu .modal-body .kefu-left ' + element_id + ' .panel-title .red_dot').fadeOut();
        }
    },
    get_format_session_time: function () {
        var date_obj = new Date();
        var hours = date_obj.getHours();
        hours = hours < 10 ? '0' + hours : hours;
        var minutes = date_obj.getMinutes();
        minutes = minutes < 10 ? '0' + minutes : minutes;
        return hours + ':' + minutes;
    },
    domsg: {
        default: (msg) => {
            // console.log('default', msg);
        },
        initialize: (msg) => {

            $('#kefu_error').html('');

            if (KeFu.ws.ws_error) {
                KeFu.ws.CurrentRetryCount = 0;
                KeFu.toggle_popover('hide');
                KeFu.ws.ws_error = false;
            }

            if (msg.data.modulename == 'admin') {

                KeFu.change_csr_status(msg.data.user_info.status_text);
                $('#modal-title').html(msg.data.chat_name + '-' + msg.data.user_info.nickname);

                // æ¸²æŸ“èŠå¤©åˆ—è¡¨
                if (msg.data.session.dialogue && msg.data.session.dialogue.length) {

                    for (let i in msg.data.session.dialogue) {
                        KeFu.buildSession(msg.data.session.dialogue[i], 'dialogue');
                    }

                    KeFu.session_id = msg.data.session.dialogue[msg.data.session.dialogue.length - 1].id;
                    $('#heading_dialogue a').click();
                }

                if (msg.data.session.invitation && msg.data.session.invitation.length) {

                    for (let i in msg.data.session.invitation) {
                        KeFu.buildSession(msg.data.session.invitation[i], 'invitation');
                    }

                }

                if (msg.data.session.recently && msg.data.session.recently.length) {

                    for (let i in msg.data.session.recently) {
                        KeFu.buildSession(msg.data.session.recently[i], 'recently');
                    }

                    if (!KeFu.session_id) {
                        KeFu.session_id = msg.data.session.recently[msg.data.session.recently.length - 1].id;
                        $('#heading_recently a').click();
                    }
                }

                KeFu.changeSession(KeFu.session_id);
            } else {
                if (msg.data.new_msg) {
                    KeFu.toggle_popover('show', msg.data.new_msg);
                    KeFu.new_message_prompt('#kefu_button');
                }
            }
        },
        user_card: (msg) => {
            if (msg.data) {
                $('#card-user').val(msg.data.nickname + ' ID:' + msg.data.id + (msg.data.user_id ? ' memberID:' + msg.data.user_id : ''));
                $('#card-nickname').val(msg.data.nickname_origin);
                $('#card-referrer').val(msg.data.referrer);
                $('#card-contact').val(msg.data.contact);
                $('#card-note').val(msg.data.note);
            }
        },
        search_user: (msg) => {
            // æ¸²æŸ“æœç´¢ç»“æžœåˆ—è¡¨
            var element_id = '#session_list_search';
            KeFu.search_primary = -1;
            KeFu.search_select_id = '';
            $(element_id).html('');
            $(element_id).fadeIn();

            if (msg.data.length) {

                $.each(msg.data, function (index, item) {

                    $(element_id).append(
                        '<li class="person" data-session="' + item.id + '" data-session_user="' + item.session_user + '" data-group="search" data-nickname="' + item.nickname + '">' +
                        '<img class="person_avatar" src="' + item.avatar + '" alt="" />' +
                        '<div class="session_info_item">' +
                        '<span class="name">' + item.nickname + '</span>' +
                        '<span class="time">' + item.last_time + '</span>' +
                        '</div>\
                        <div class="session_info_item">' +
                        '<span class="preview">' + item.last_message + '</span>' +
                        '</div>' +
                        '</li>'
                    );
                });
            } else {
                $(element_id).append('<div class="none_session">User not found~</div>');
            }
        },
        user_initialize: (msg) => {
            // ç”¨æˆ·å®¢æœåˆ†é…ç»“æŸ
            if (msg.code == 1) {

                if (msg.data.session.user_tourists) {
                    KeFu.sendMessage = function () {
                        layer.msg('Please log in to send a message~');
                    }
                    KeFu.edit_send_tis('To protect your privacy please <a href="' + msg.data.session.user_login_url + '">login</a> Send message');
                }
                KeFu.csr = msg.data.session.csr;
                KeFu.session_id = msg.data.session.id;
                $('#modal-title').html('Jtech Customer Service ' + msg.data.session.nickname + ' at your service');
                KeFu.toggle_window_view('kefu_scroll');
                KeFu.change_csr_status(msg.data.session.csr_status);
            } else if (msg.code == 302) {

                if (!KeFu.csr) {

                    // æ‰“å¼€ç•™è¨€æ¿
                    KeFu.csr = 'none';
                    $('#modal-title').html('There is currently no customer service online~');
                    KeFu.toggle_window_view('kefu_leave_message');
                } else {
                    KeFu.edit_send_tis('The current customer service is temporarily away, you can send offline messages directly here');
                }

            }
        },
        action_session: (msg) => {
            if (msg.data.action == 'received_invitation' && !KeFu.window_is_show) {

                // æ˜¾ç¤ºé‚€è¯·æ¡†
                var kefu_invite_box = $('.kefu_invite_box');
                if (kefu_invite_box.length) {
                    kefu_invite_box.fadeIn();
                } else {
                    KeFu.bulidInviteBox();
                }
            } else if (msg.data.action == 'send_success' && KeFu.session_user == msg.data.session_user) {

                // é‡æ–°åŠ è½½è½¨è¿¹
                var session = $("#session_panel [data-session_user='" + msg.data.session_user + "']");
                KeFu.changeSession(session.data('session'), 'trajectory');
            } else if (msg.data.action == 'transfer') {

                // æ˜¾ç¤ºè½¬æŽ¥æ“ä½œé¢æ¿
                var tpl = '\
                <div class="kefu_transfer_session" data-transfer_user="' + msg.data.session_user + '">\
                    <div class="form-group">\
                        <label>Transfer to</label>\
                        <select id="transfer_session_select" class="form-control">\
                        </select>\
                        <div class="transfer_session_buttons">\
                            <button type="button" id="transfer_session_cancel" class="btn btn-default btn-sm">cancel</button>\
                            <button type="button" id="transfer_session_ok" class="btn btn-success btn-sm">confirm</button>\
                        </div>\
                    </div>\
                </div>';

                var session = $("#session_panel [data-session_user='" + msg.data.session_user + "']");
                session.after(tpl);

                $.each(msg.data.csr_list, function (index, item) {
                    let html_text = item.nickname + '(ID:' + item.admin_id + ')';
                    $("#transfer_session_select").append("<option value='" + item.admin_id + "'>" + html_text + "</option>");
                });

                $(document).on('click', '#transfer_session_cancel', function (e) {
                    $('.kefu_transfer_session').remove();
                });

                $(document).on('click', '#transfer_session_ok', function (e) {

                    var transfer_user = $('.kefu_transfer_session').data('transfer_user');
                    var csr = $('#transfer_session_select').val();


                    if (transfer_user && csr) {
                        var action_session = {
                            c: 'Message',
                            a: 'actionSession',
                            data: {
                                action: 'transfer_done',
                                session_user: transfer_user,
                                csr: csr
                            }
                        };
                        KeFu.ws_send(action_session);
                    }

                    $('.kefu_transfer_session').remove();
                });

            } else if (msg.data.action == 'transfer_done' && msg.data.res) {

                // è½¬ç§»æˆåŠŸ
                layer.msg('Conversation has been transferred to customer service ' + msg.data.res);
                $("#session_panel [data-session_user='" + msg.data.session_user + "']").remove();
                KeFu.group_session_is_none('dialogue');
                KeFu.group_session_is_none('recently');
            } else if (msg.data.action == 'edit_nickname') {
                var session = $("#session_panel [data-session_user='" + msg.data.session_user + "']");
                session.children(".session_info_item").children(".name").eq(0).html(msg.data.list_nickname);

                if (KeFu.session_user == msg.data.session_user) {
                    $('#session_user_name').html(msg.data.new_nickname);
                }
            }
        },
        leave_message: (msg) => {
            layer.msg(msg.msg);
            $('#kefu_leave_message form')[0].reset()
        },
        show_msg: (msg) => {
            layer.msg(msg.msg);
        },
        clear: (msg) => {
            if (msg.msg) {
                layer.msg(msg.msg);
            }

            var clear = {
                c: 'Message',
                a: 'clear'
            };
            KeFu.ws_send(clear);

            KeFu.retry_webSocket = function () {
                clearInterval(KeFu.ws.Timer)
            };
        },
        offline: (msg) => {
            if (KeFu.config.modulename == 'admin') {
                $("#session_panel [data-transfer_user='" + msg.user_id + "']").remove();
                KeFu.edit_online_status(msg.user_id, false);
            } else {
                if (msg.user_id == KeFu.csr) {
                    KeFu.edit_send_tis('The current customer service is temporarily away, you can send offline messages directly here');
                    KeFu.change_csr_status(0);
                }
            }
        },
        online: (msg) => {
            var element = $("#session_panel [data-session_user='" + msg.user_id + "']");

            if (msg.tourists != 'not' && !element.length) {
                // æ·»åŠ åˆ°é‚€è¯·ä¸­
                KeFu.buildSession(msg.tourists, 'invitation');

                if (!KeFu.group_show.invitation) {
                    KeFu.session_group_red_dot('invitation', true);
                }
            }

            if (KeFu.window_is_show && KeFu.session_user == msg.user_id) {
                $('#session_user_name').html(msg.user_name);
            }

            // ä¿®æ”¹ç”¨æˆ·åœ¨çº¿çŠ¶æ€
            KeFu.edit_online_status(msg.user_id, true);

            // æ¥è‡ª admin çš„ç”¨æˆ·ä¸Šçº¿äº†
            if (msg.modulename == 'admin') {

                if (msg.user_id == KeFu.csr) {
                    let send_tis_key = parseInt(KeFu.config.send_message_key) == 1 ? 'Enter' : 'Ctrl+Enter';
                    KeFu.edit_send_tis('Press down' + send_tis_key + 'send messages', 'Press down' + (send_tis_key == 'Enter' ? 'Ctrl+Enter' : 'Enter') + 'Wrap');
                    KeFu.change_csr_status(3);
                } else if (KeFu.csr == 'none') {
                    // é‡æ–°ä¸ºç”¨æˆ·åˆ†é…å®¢æœä»£è¡¨
                    var user_initialize = {
                        c: 'Message',
                        a: 'userInitialize'
                    };
                    KeFu.ws_send(user_initialize);
                }
            }
        },
        trajectory: (msg) => {
            var trajectory = msg.data.trajectory;
            KeFu.chat_record_page = msg.data.next_page;

            if (msg.data.page == 1) {
                $('#kefu_trajectory_log').html('');

                // ä¿®æ”¹ä¼šè¯çš„æœ€åŽæ¶ˆæ¯
                let session = $("#session_panel [data-session_user='" + msg.data.user_info.session_user + "']");
                session.children(".session_info_item").children(".time").eq(0).html(msg.data.last_message.last_time);
                session.children(".session_info_item").find(".last_message").eq(0).html(msg.data.last_message.last_message);
            }

            $('#session_user_name').html(msg.data.user_info.nickname);

            // æž„å»ºè½¨è¿¹
            var x = 'left';
            for (let i in trajectory) {
                if (msg.data.page == 1) {
                    KeFu.build_trajectory(i, msg.data.page, 'date');
                }

                for (let y in trajectory[i]) {
                    KeFu.build_trajectory(trajectory[i][y], msg.data.page, 'log', x);
                    x = (x == 'left') ? 'right' : 'left';
                }

                if (msg.data.page != 1) {
                    KeFu.build_trajectory(i, msg.data.page, 'date');
                }
            }

            KeFu.kefu_blacklist(3, msg.data.user_info.session_user, msg.data.user_info.blacklist);

            if (msg.data.page == 1) {
                if (KeFu.window_is_show) {
                    $('#kefu_trajectory').scrollTop($('#kefu_trajectory')[0].scrollHeight);
                } else {
                    KeFu.window_show_event = function () {
                        $('#kefu_trajectory').scrollTop($('#kefu_trajectory')[0].scrollHeight);
                    }
                }
            } else {
                $('#kefu_trajectory').scrollTop($('#kefu_trajectory')[0].scrollHeight - KeFu.record_scroll_height);
            }
        },
        chat_record: (msg) => {
            if (msg.data.page == 1) {
                $('#kefu_scroll').html('');
            }

            if (KeFu.config.modulename == 'admin') {
                $('#session_user_name').html(msg.data.session_info.nickname);
            }

            var chat_record = msg.data.chat_record;
            KeFu.chat_record_page = msg.data.next_page;
            for (let i in chat_record) {

                if (msg.data.page == 1) {
                    KeFu.buildPrompt(chat_record[i].datetime, msg.data.page);
                }

                for (let y in chat_record[i].data) {
                    KeFu.buildRecord(chat_record[i].data[y], msg.data.page)
                }

                if (msg.data.page != 1) {
                    KeFu.buildPrompt(chat_record[i].datetime, msg.data.page);
                }
            }

            KeFu.kefu_blacklist(3, msg.data.session_info.session_user, msg.data.session_info.blacklist);

            if (msg.data.page == 1) {
                if (KeFu.window_is_show) {
                    setTimeout(function () {
                        $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);
                    }, 100)
                } else {
                    KeFu.window_show_event = function () {
                        $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);
                    }
                }
            } else {
                $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight - KeFu.record_scroll_height);
            }

            // æ¶ˆæ¯è¾“å…¥æ¡†èšç„¦
            setTimeout(function () {
                $('#kefu_message').focus();
            }, 500)
        },
        csr_change_status: (msg) => {
            if (KeFu.config.modulename == 'admin' && KeFu.config.user_id == msg.data.csr) {
                KeFu.change_csr_status(msg.data.csr_status);
            } else if (KeFu.csr == msg.data.csr) {
                KeFu.change_csr_status(msg.data.csr_status);
            }
        },
        blacklist: (msg) => {
            if (msg.data.action == 'del') {
                KeFu.kefu_blacklist(2, msg.data.session_user);
            } else if (msg.data.action == 'add') {
                KeFu.kefu_blacklist(1, msg.data.session_user);
            }
        },
        transfer_done: (msg) => {
            KeFu.csr = msg.data.csr;
            $('#modal-title').html('Customer service ' + msg.data.nickname + ' at your service');
        },
        reload_record: (msg) => {
            // é‡è½½èŠå¤©è®°å½•
            if (KeFu.session_id == msg.data.session_id) {
                var load_record = {
                    c: 'Message',
                    a: 'chatRecord',
                    data: {
                        session_id: msg.data.session_id,
                        page: 1
                    }
                };
                KeFu.ws_send(load_record)
            }
        },
        new_message: (msg) => {
            var message_content = msg.data.nickname + ':' + msg.data.last_message;

            if (KeFu.window_is_show) {
                // çª—å£æ‰“å¼€çŠ¶æ€
                KeFu.new_message_prompt('#KeFuModal');
            } else {
                KeFu.toggle_popover('show', message_content);
                KeFu.new_message_prompt('#kefu_button');
            }

            if ($('#kefu_scroll').children('.status').children('span').eq(0).html() == 'No news yet') {
                $('#kefu_scroll').children('.status').children('span').eq(0).html(KeFu.get_format_session_time());
            }

            if (msg.data.session_id == KeFu.session_id) {
                $('#kefu_input_status').html('');
            }

            if (KeFu.config.modulename == 'admin') {

                // ä¸ºä¼šè¯ä¸­æ·»åŠ ä¸€ä¸ªçº¢ç‚¹
                if (!KeFu.group_show.dialogue) {
                    KeFu.session_group_red_dot('dialogue', true);
                }

                // æ£€æŸ¥æ˜¯å¦æœ‰è¯¥ä¼šè¯
                let session = $("#session_panel [data-session_user='" + msg.data.session_user + "']");

                // è®°å½•æœ€åŽå‘ä¿¡äºº
                KeFu.last_sender = msg.data.session_id;

                if (session.length == 0) {
                    KeFu.buildSession(msg.data, 'dialogue');
                    KeFu.group_session_is_none('dialogue');
                } else {

                    // ä¼šè¯å°†è¢«ç§»åŠ¨->å–æ¶ˆä¼šè¯è½¬ç§»
                    $("#session_panel [data-transfer_user='" + msg.data.session_user + "']").remove();

                    // ç¡®ä¿ data æ­£ç¡®
                    session.data('session', msg.data.session_id);
                    session.attr("data-session", msg.data.session_id);
                    session.data('group', 'dialogue');
                    session.attr("data-group", 'dialogue');

                    // ä¿®æ”¹è¯¥ä¼šè¯çš„æœ€åŽæ¶ˆæ¯
                    session.children(".session_info_item").children(".time").eq(0).html(msg.data.last_time);
                    session.children(".session_info_item").find(".last_message").eq(0).html(msg.data.last_message);

                    // å°†ä¼šè¯ç§»åŠ¨åˆ°â€œä¼šè¯ä¸­â€çš„ç¬¬ä¸€ä½
                    let first_session = $('#session_list_dialogue li');

                    if (first_session.length) {
                        // ä¼šè¯ä¸­å·²æœ‰å¯¹è¯
                        first_session.eq(0).before(session);
                    } else {
                        // ä¼šè¯ä¸­æ²¡æœ‰å¯¹è¯
                        $('#session_list_dialogue').prepend(session);
                    }

                    KeFu.group_session_is_none('dialogue');
                    KeFu.group_session_is_none('recently');
                    KeFu.group_session_is_none('invitation');

                    if (msg.data.session_user == KeFu.session_user && KeFu.window_is_show) {

                        if (session.data('group') != 'dialogue') {

                            // ä¼šè¯è¢«ç§»åŠ¨åˆ°â€œä¼šè¯ä¸­â€->å–æ¶ˆè¯¥ä¼šè¯çš„é€‰æ‹©çŠ¶æ€
                            session.removeClass("active");
                        } else {

                            if ($('#kefu_trajectory').css('display') != 'block') {
                                // å¿…è¦æ—¶ï¼ŒåŽ»é™¤è¯¥ä¼šè¯çš„çº¢ç‚¹
                                KeFu.buildRecord(msg.data, 1);
                                $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);

                                var load_message = {
                                    c: 'Message',
                                    a: 'readMessage',
                                    data: {
                                        record_id: msg.data.record_id,
                                        session_id: KeFu.session_id
                                    }
                                };

                                KeFu.ws_send(load_message);
                                return;
                            }
                        }
                    }

                    if (msg.data.unread_msg_count > 0) {
                        session.children(".session_info_item").children(".unread_msg_count").eq(0).html(msg.data.unread_msg_count).fadeIn();
                    } else {
                        session.children(".session_info_item").children(".unread_msg_count").eq(0).fadeOut();
                    }
                }

            } else {

                KeFu.buildRecord(msg.data, 1);

                if (msg.data.session_id == KeFu.session_id && KeFu.window_is_show) {

                    $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);

                    var load_message = {
                        c: 'Message',
                        a: 'readMessage',
                        data: {
                            record_id: msg.data.record_id,
                            session_id: KeFu.session_id
                        }
                    };

                    KeFu.ws_send(load_message);
                    return;
                }
            }
        },
        send_message: (msg) => {
            if (!msg.data.message_id) {
                return;
            }

            if (msg.code == 1) {
                let message_record = $('.kefu_message_' + msg.data.message_id);
                message_record.text('unread');
                message_record.removeClass('kefu_message_' + msg.data.message_id);
                message_record.addClass('kefu_message_' + msg.data.id);
            } else {
                $('.kefu_message_' + msg.data.message_id).addClass('kf-text-red').text('failure');
                layer.msg(msg.data.msg)
            }
        },
        read_message_done: (msg) => {

            if (msg.data.record_id == 'all') {
                if (KeFu.session_id == msg.data.session_id) {
                    $('.kefu_message_status').addClass('kf-text-grey').text('read');
                }
            } else {
                let message_record = $('.kefu_message_' + msg.data.record_id);
                message_record.addClass('kf-text-grey').text('read');
            }

        },
        message_input: (msg) => {
            var input_status_display = parseInt(KeFu.config.input_status_display);
            if (input_status_display == 0) {
                return;
            } else if (input_status_display == 2 && KeFu.config.modulename != 'admin') {
                return;
            }

            if (KeFu.session_id == msg.data.session_id) {
                if (msg.data.type == 'input') {
                    $('#kefu_input_status').html('The other party is typing...');
                } else {
                    $('#kefu_input_status').html('');
                }
            }
        },
        upload_multipart: (msg) => {
            if (msg.data.upload_multipart) {
                KeFu.config.upload.multipart = msg.data.upload_multipart
            }
        }
    },
    ws_send: function (message) {

        if (!message) {
            message = {c: 'Message', a: 'ping'};
        }

        if (KeFu.ws.SocketTask && KeFu.ws.SocketTask.readyState == 1) {
            KeFu.ws.SocketTask.send(JSON.stringify(message));
        } else {
            // console.log('æ¶ˆæ¯å‘é€å‡ºé”™', message)
            KeFu.ws.ErrorMsg.push(message);
        }

    },
    edit_send_tis: function (tis, title = '') {
        $('.KeFu .modal-body #send_tis').html(tis);
        $('.KeFu .modal-body #send_tis').attr('title', title);
    },
    toggle_popover: function (toggle, content) {
        $('.message').text(content)
        if (!KeFu.window_is_show && content && toggle == 'show') {
            $('#kefu_button').attr("data-content", content);
            $('#kefu_button').popover('show');
        } else {
            $('#kefu_button').popover('hide');
        }
    },
    // åˆ‡æ¢æ˜¾ç¤ºçš„è§†å›¾-èŠå¤©è§†å›¾ã€è½¨è¿¹è§†å›¾ã€ç•™è¨€è§†å›¾ã€ç”¨æˆ·åç‰‡è§†å›¾
    toggle_window_view: function (show_view_id) {

        // éšè—æ‰€æœ‰è§†å›¾
        $('.kefu_window_view').hide();
        // æ˜¾ç¤ºæŒ‡å®šçš„è§†å›¾
        $('#' + show_view_id).show();

        // èŠå¤©
        if (show_view_id == 'kefu_scroll') {

            $('.modal-body .write').show();
            if (KeFu.config.modulename == 'admin') {
                $('.KeFu .modal-body .kefu-right .chat').height('calc(100% - 158px)');
            }

        } else {

            if (KeFu.config.modulename == 'admin') {
                KeFu.hide_tool_panel();
                $('.KeFu .modal-body .kefu-right .chat').height('calc(100% - 58px)');
            }
            $('.modal-body .write').hide();
        }

        // è½¨è¿¹
        if (show_view_id == 'kefu_trajectory') {
            $('#kefu_view_trajectory').fadeOut();
        } else {
            $('#kefu_view_trajectory').fadeIn();
        }

        // åç‰‡
        if (show_view_id == 'kefu_user_card') {
            $('#kefu_view_user_card').fadeOut();
        } else {
            $('#kefu_view_user_card').fadeIn();
        }

    },
    toggle_window: function (toggle) {

        if (toggle == 'show') {

            KeFu.window_is_show = true;

            if (!KeFu.isPc() && KeFu.config.modulename != 'admin') {
                // è·³è½¬åˆ°æ‰‹æœºå•é¡µ
                window.location.href = KeFu.buildUrl(KeFu.url, KeFu.config.modulename, 'mobile');
                return;
            }

            // éšè—æ‚¬æµ®æŒ‰é’®
            KeFu.toggle_popover('hide');
            $('#kefu_button').fadeOut();

            // æ£€æŸ¥ websocket æ˜¯å¦è¿žæŽ¥
            if (!KeFu.ws.SocketTask || KeFu.ws.SocketTask.readyState != 1) {
                KeFu.ConnectSocket();
            }

            // éšè—é‚€è¯·æ¡†
            $('.kefu_invite_box').fadeOut();

            $('#KeFuModal').modal({
                // keyboard: (KeFu.config.ecs_exit == '1') ? true:false,
                keyboard: false,
                show: true
            });

            if (KeFu.config.modulename != 'admin') {

                // åˆ†é…/èŽ·å–å®¢æœ->èŽ·å–èŠå¤©è®°å½•
                var user_initialize = {
                    c: 'Message',
                    a: 'userInitialize',
                    data: {
                        fixed_csr: KeFu.fixed_csr
                    }
                };
                KeFu.ws_send(user_initialize);

                // ç»‘å®šçª—å£ä¸­çš„åŠ¨æ€æ•°æ®
                if (KeFu.config.slider_images.length > 0) {

                    var SlideLi = '<div id="kefu_chat_slide" class="carousel slide" data-ride="carousel">' +
                        KeFu.buildSlideLi(KeFu.config.slider_images.length);

                    var slider_inner = '<div class="carousel-inner">';
                    for (var i = 0; i < KeFu.config.slider_images.length; i++) {
                        slider_inner += KeFu.buildSlide(i, KeFu.config.slider_images[i]);
                    }
                    slider_inner += '</div></div>';

                    $('#kefu_chat_slide_f').html(SlideLi + slider_inner);
                    $('#kefu_chat_slide_f').fadeIn();

                    $('#kefu_chat_slide').carousel({
                        interval: 3000
                    })
                }

                if (KeFu.config.chat_introduces) {
                    $('.KeFu .modal-body .kefu-right .chat_introduces').html(KeFu.config.chat_introduces);
                } else {
                    $('.KeFu .modal-body .kefu-right .chat_introduces').fadeOut();
                }

                if (KeFu.config.announcement) {
                    $('.KeFu .modal-body .kefu-left .announcement #announcement').html(KeFu.config.announcement);
                } else {
                    $('.KeFu .modal-body .kefu-left .announcement').fadeOut();
                    $('.KeFu .modal-body .kefu-left .chat').height('calc(100% - 110px)');
                }
            } else {

                // æ‰¾åˆ°å½“å‰ä¼šè¯ï¼ŒåŽ»æŽ‰çº¢ç‚¹æ ‡è®°(ç›´æŽ¥é‡è½½å½“å‰ä¼šè¯)
                if (KeFu.session_id) {
                    // èŠå¤©è®°å½•çš„è¯·æ±‚
                    var load_message = {
                        c: 'Message',
                        a: 'chatRecord',
                        data: {
                            session_id: KeFu.session_id,
                            page: 1
                        }
                    };

                    KeFu.ws_send(load_message);
                    // æ¸…ç†çº¢ç‚¹
                    var session = $("#session_panel [data-session='" + KeFu.session_id + "']");
                    session.children(".session_info_item").children(".unread_msg_count").eq(0).fadeOut();
                }

            }

            let send_tis_key = parseInt(KeFu.config.send_message_key) == 1 ? 'Enter' : 'Ctrl+Enter';
            KeFu.edit_send_tis('Press down' + send_tis_key + 'send messages', 'Press down' + (send_tis_key == 'Enter' ? 'Ctrl+Enter' : 'Enter') + 'Wrap');
        } else {
            $('#KeFuModal').modal('hide');
        }
    },
    bulidInviteBox: function () {
        if (!KeFu.window_is_show && !KeFu.csr) {
            var el = '<div class="kefu_invite_box" style="background: url(' + KeFu.config.invite_box_img + ') no-repeat;background-size: 100% 100%;">\
                <div class="invite_box_close">&times;</div>\
                <div class="bottom_button">\
                <div class="later">Later</div>\
                <div class="consulting">Consult now</div>\
                </div>\
            </div>';
            $("body").append(el);
        }

        if (parseInt(KeFu.config.only_first_invitation) == 1) {
            localStorage.setItem('kefu_auto_invitation', true);
        }

        $(document).on('click', '.invite_box_close,.kefu_invite_box .later', function () {
            $('.kefu_invite_box').fadeOut();
        });
    },
    bulidChat: function (window_html) {

        $("body").append(window_html);

        // åˆå§‹åŒ– popover
        $('#kefu_button').popover({
            trigger: 'manual',
            template: '<div class="popover kefu_popover" style="border: 1px solid #1A00F8;" role="tooltip"><div class="arrow"></div><h3 class="popover-title"></h3><div class="popover-content"></div></div>',
            container: '.KeFu'
        });

        if (KeFu.browserType() == "FF") {
            $('#kefu_message').attr('contenteditable', true);
        }

        // åˆå§‹åŒ–æ–‡ä»¶md5åº“ï¼Œè¯¥åº“å·²ä¿®æ”¹ä¸ºæ”¯æŒgetScript
        if (KeFu.config.upload.storage != 'local') {
            $.getScript(KeFu.buildUrl(KeFu.url, KeFu.config.modulename, 'spark'), function () {

                // æ›´æ–°äº‘å­˜å‚¨multipart
                $(document).on('click', '#chatfile', function () {
                    var user_initialize = {
                        c: 'Message',
                        a: 'getUploadMultipart'
                    };
                    KeFu.ws_send(user_initialize);
                });

                KeFu.getFileMd5 = function (file, cb) {
                    var blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice,
                        chunkSize = 2097152,
                        chunks = Math.ceil(file.size / chunkSize),
                        currentChunk = 0,
                        spark = new $.fn.SparkMD5.ArrayBuffer(),
                        fileReader = new FileReader();

                    fileReader.onload = function (e) {
                        spark.append(e.target.result);
                        currentChunk++;
                        if (currentChunk < chunks) {
                            loadNext();
                        } else {
                            cb && cb(spark.end());
                        }
                    };

                    fileReader.onerror = function () {
                        layer.msg('File read error, please try againï¼');
                    };

                    function loadNext() {
                        var start = currentChunk * chunkSize,
                            end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

                        fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
                    }

                    loadNext();
                }
            });
        }

        // åˆå§‹åŒ–å›¾ç‰‡ç²˜è´´/æ‹–æ‹½ä¸Šä¼ 
        $.getScript(KeFu.buildUrl(KeFu.url, KeFu.config.modulename, 'pasteupload.js'), function () {

            var upload_msg_index = 0;

            $.fn.pasteText = function (text) {
                // $('#kefu_message').append(text);
                upload_msg_index = layer.msg('Uploading picture...', {'time': 0});
            };

            $.fn.insertToTextArea = function (filename, url) {
                var options = $(this).data("pu-options") || $.fn.pasteUploadImage.defaults;

                var img_node = document.createElement('img');
                img_node.src = url;
                img_node.className = 'record';
                KeFu.insertToMessage(img_node);

                layer.close(upload_msg_index)
            };

            //ç²˜è´´ä¸Šä¼ å›¾ç‰‡
            $.fn.pasteUploadImage.defaults = $.extend(true, $.fn.pasteUploadImage.defaults, {
                fileName: "file",
                appendMimetype: false,
                uploadingText: 'uploading...',
                ajaxOptions: {
                    url: KeFu.config.upload.uploadurl,
                    beforeSend: function (jqXHR, settings) {
                        $.each(KeFu.config.upload.multipart, function (i, j) {
                            settings.data.append(i, j);
                        });
                        return true;
                    }
                },
                success: function (data, filename, file) {
                    var ret = KeFu.onUploadResponse(data);
                    var url = KeFu.config.upload.cdnurl + ret.data.url;
                    $(this).insertToTextArea(filename, url);
                    // å‘é€notifyè¯·æ±‚
                    if (KeFu.config.upload.storage != 'local') {
                        KeFu.getFileMd5(file, function (md5) {
                            var ajax_data = {
                                size: file.size,
                                name: file.name,
                                md5: md5,
                                type: file.type,
                                url: ret.data.url
                            };

                            for (let i in KeFu.config.upload.multipart) {
                                ajax_data[i] = KeFu.config.upload.multipart[i];
                            }

                            $.ajax({
                                url: KeFu.buildUrl(KeFu.url, KeFu.config.upload.storage, 'storage_notify'),
                                type: 'POST',
                                data: ajax_data
                            });
                        })
                    }
                    return false;
                },
                error: function (data, filename, file) {
                    layer.close(upload_msg_index)
                    layer.msg('Image upload failed, please try again~');
                }
            });

            $('#kefu_message').pasteUploadImage();
        });
    },
    buildPrompt: function (data, page) {
        if (page == 1) {
            $('#kefu_scroll').append('<div class="status"><span>' + data + '</span></div>');
        } else {
            $('#kefu_scroll').prepend('<div class="status"><span>' + data + '</span></div>');
        }
    },
    onUploadResponse: function (response) {
        try {
            var ret = typeof response === 'object' ? response : JSON.parse(response);
            if (!ret.hasOwnProperty('code')) {
                $.extend(ret, {code: -2, msg: response, data: null});
            }
        } catch (e) {
            var ret = {code: -1, msg: e.message, data: null};
        }
        return ret;
    },
    changeSession: function (session_id, why = 'session') {

        if (KeFu.config.modulename != 'admin') {
            return;
        }

        // æ‰¾åˆ°è¿™ä¸ªä¼šè¯
        var element = $("#session_panel [data-session='" + session_id + "']");

        if (element.length == 0) {
            KeFu.session_id = 0;
            $('#session_user_name').html('No conversation');
            return;
        }

        // å–æ¶ˆæ‰€æœ‰é€‰æ‹©
        $('.person').removeClass("active");
        element.addClass("active");

        // éšè—è¡¨æƒ…å’Œå¿«æ·å›žå¤é¢æ¿
        KeFu.hide_tool_panel();

        if ($('.KeFu .modal-body .kefu-left').css('display') != 'none') {
            $('#kefu_message').focus();
        }

        // è¯¥å¯¹è¯æ‰€åœ¨åˆ†ç»„æ˜¯å¦å±•å¼€
        let group = element.data('group');
        if (group == 'invitation' && !KeFu.group_show.invitation) {
            $('#heading_invitation a').click();
        } else if (group == 'dialogue' && !KeFu.group_show.dialogue) {
            $('#heading_dialogue a').click();
        } else if (group == 'recently' && !KeFu.group_show.recently) {
            $('#heading_recently a').click();
        }

        // è®°å½•ä¼šè¯ç”¨æˆ·
        KeFu.session_user = element.data('session_user');
        KeFu.session_id = session_id;

        if (element.data('group') == 'invitation' || why == 'trajectory') {

            // åŠ è½½è½¨è¿¹è®°å½•
            var load_log = {
                c: 'Message',
                a: 'trajectory',
                data: {
                    session_user: KeFu.session_user,
                    page: 1
                }
            };

            // æ‰“å¼€è½¨è¿¹è§†å›¾
            KeFu.toggle_window_view('kefu_trajectory');
        } else {

            // æ‰“å¼€èŠå¤©è®°å½•è§†å›¾
            KeFu.toggle_window_view('kefu_scroll');

            // æ¸…ç†çº¢ç‚¹
            element.children(".session_info_item").children(".unread_msg_count").eq(0).fadeOut();

            // èŠå¤©è®°å½•çš„è¯·æ±‚
            var load_log = {
                c: 'Message',
                a: 'chatRecord',
                data: {
                    session_id: session_id,
                    page: 1
                }
            };
        }

        if (KeFu.window_is_show) {
            KeFu.ws_send(load_log);
        } else {
            KeFu.window_show_event = function () {
                KeFu.ws_send(load_log);
            }
        }
    },
    buildSession: function (item, group) {

        var element_id = '#session_list_' + group;

        if ($("#session_panel [data-session='" + item.id + "']").length) {
            // åŽ»æŽ‰è¯¥ä¼šè¯å†æ·»åŠ æœ€æ–°çš„
            $("#session_panel [data-session='" + item.id + "']").remove();
        }

        $(element_id).prepend(
            '<li class="person" data-session="' + item.id + '" data-session_user="' + item.session_user + '" data-group="' + group + '">' +
            '<img class="person_avatar' + (item.online ? '' : ' person_head_gray') + '" src="' + item.avatar + '" alt="" />' +
            '<div class="session_info_item">' +
            '<span class="name">' + item.nickname + '</span>' +
            '<span class="time">' + item.last_time + '</span>' +
            '</div>\
            <div class="session_info_item">' +
            '<span class="preview"><span style="' + (item.online ? 'display:none;' : '') + '" class="session_user_status">[Offline]</span><span class="last_message">' + item.last_message + '</span></span>' +
            (item.unread_msg_count ? '<span class="unread_msg_count">' + item.unread_msg_count + '</span>' : '<span class="unread_msg_count count_hide"></span>') +
            '</div>' +
            '</li>'
        );

        KeFu.group_session_is_none(group);
    },
    build_trajectory: function (data, page, build_way, pos = 'left') {

        if (build_way == 'log') {

            const log_data = new Map([
                [0, ['access', data.note + 'Visit pageï¼š' + data.url + '<br />sourceï¼š' + data.referrer]],
                [1, ['be invited', '']],
                [2, ['Start conversation', '']],
                [3, ['Refuse to talk', '']],
                [4, ['Customer Service Assignment', '']],
                [5, ['User left', 'The user\'s workerman link is broken']],
                [6, ['leave a message', '<a href="./kefu/leavemessage/index?id=' + data.note + '&title=test&ref=addtabs">Click to view message</a>']],
                [7, ['other', '']],
                [8, ['Transfer session', '']],
                ['default', ['unknown', '']],
            ])

            var log = log_data.get(parseInt(data.log_type)) || log_data.get('default');

            var element = '\
            <dd class="pos-' + pos + ' clearfix">\
                <div class="circ"></div>\
                <div class="time">' + data.createtime + '</div>\
                <div class="events">\
                    <div class="events-header">' + log[0] + '</div>\
                        <div class="events-body">' + (log[1] ? log[1] : data.note) + '</div>\
                    </div>\
                </div>\
            </dd>\
            ';
        } else {
            var element = '<dt> ' + data + ' </dt>';
        }

        if (page == 1) {
            $('#kefu_trajectory_log').append(element);
        } else {
            $('#kefu_trajectory_log').prepend(element);
        }
    },
    buildRecord: function (data, page, message_id = 'none') {
        var message = '';

        if (data.message_type == 1) {
            message = KeFu.buildChatImg(data.message, 'Chat picture', 'record');
        } else if (data.message_type == 2) {
            var file_name = data.message.split('.');
            var file_suffix = file_name[file_name.length - 1];
            message = KeFu.buildChatA(data.message, 'click to download ' + file_suffix + ' file', 'record');
        } else if (data.message_type == 3) {
            KeFu.buildPrompt(data.message, page);
            return;
        } else if (data.message_type == 4 || data.message_type == 5) {
            message = KeFu.buildChatCard(data.message, data.message_type);
        } else {
            message = data.message;
        }

        var status_html = '';
        if (data.sender == 'me') {
            if (message_id == 'none') {
                message_id = data.id;
                var msg_status = parseInt(data.status);
                status_html = '<span class="kefu_message_status kefu_message_' + message_id + (msg_status == 0 ? '' : ' kf-text-grey') + '">' + (msg_status == 0 ? 'unread' : 'read') + '</span>';
            } else {
                status_html = '<span class="kefu_message_status kefu_message_' + message_id + '"></span>';
            }
        }

        if (page == 1) {
            $('#kefu_scroll').append('<div class="bubble ' + data.sender + '">' + message + status_html + '</div>');
        } else {
            $('#kefu_scroll').prepend('<div class="bubble ' + data.sender + '">' + message + status_html + '</div>');
        }
    },
    /**
     * æž„å»ºå•†å“æˆ–è®¢å•å¡ç‰‡
     */
    buildChatCard: function (message, message_type) {

        var message = message.split('#');
        var message_arr = [];
        for (let i in message) {
            let message_temp = message[i].split('=');
            if (typeof message_temp[1] != 'undefined') {
                message_arr[message_temp[0]] = message_temp[1];
            }
        }

        var card_url = (KeFu.config.modulename == 'admin') ? "javascript:layer.msg('The card is not enabled, please check the window tool management');" : 'javascript:;';
        var a_class_name = 'btn-addtabs';
        if (message_type == 4 && KeFu.config.toolbar.goods && KeFu.config.modulename == 'admin') {
            card_url = message_arr['url'] + '?ref=addtabs&id=' + message_arr['id'];
        } else if (message_type == 5 && KeFu.config.toolbar.order && KeFu.config.modulename == 'admin') {
            card_url = message_arr['url'] + '?ref=addtabs&id=' + message_arr['id'];
        } else {
            a_class_name = '';
        }

        return '<a class="" href="javascript:;" onclick="goOrder('+message_arr['category']+','+message_arr['id']+')">\n' +
            '   <div class="record_card">\n' +
            '       <img src="' + message_arr['image'] + '" />\n' +
            '       <div class="record_card_body">\n' +
            '           <div class="record_card_title">' + message_arr['subject'] + '</div>\n' +
            (message_arr['note'] ? '<div class="record_card_note">' + message_arr['note'] + '</div>\n' : '') +
            '           <div class="record_card_price">\n' +
            (message_arr['price'] ? '<span>' + message_arr['price'] + '</span>\n' : '') +
            (message_arr['card_value'] ? '<span>x' + message_arr['card_value'] + '</span>\n' : '') +
            '           </div>\n' +
            '       </div>\n' +
            '   </div>\n' +
            '   </a>';
    },
    buildChatA: function (url, title, class_name) {
        return '<a target="_blank" title="' + url + '" class="' + class_name + '" href="' + url + '">' + title + '</a>';
    },
    buildChatImg: function (filename, facename, class_name = 'emoji') {
        return '<img class="' + class_name + '" src="' + filename + '" />';
    },
    buildSlideLi: function (count) {

        var slider_li_el = '<ol class="carousel-indicators" style="margin-bottom:0;bottom:10px !important;">';
        for (var i = 0; i < count; i++) {
            slider_li_el += '<li data-target="#kefu_chat_slide" data-slide-to=' + i + ' class="' + (i == 0 ? 'active' : '') + '"></li>';
        }
        return slider_li_el += '</ol>';
    },
    buildSlide: function (index, img_scr) {
        return '\
            <div class="item ' + (index == 0 ? 'active' : '') + '">\
                <img src="' + img_scr + '" alt="" />\
            </div>';
    },
    /**
     * æž„å»ºå„ç§Urlï¼Œæ‹¼æŽ¥å‚æ•°
     */
    buildUrl: function (url, modulename, type = 'ws', wsport = 1818) {

        var protocol = window.location.protocol + '//';
        var port = window.location.port;
        port = port ? ':' + port : '';

        // ç”¨æˆ·çš„èº«ä»½é€šè¿‡ KeFu.config.kefu_token æ¥è¯†åˆ«
        var token = KeFu.token_list.kefu_token ? '&token=' + KeFu.token_list.kefu_token : '';

        // æ¸¸å®¢çš„token
        var kefu_tourists_token = localStorage.getItem('kefu_tourists_token');
        kefu_tourists_token = kefu_tourists_token ? '&kefu_tourists_token=' + kefu_tourists_token : '';

        var goods_and_order = () => {

            var data_api_url = KeFu.config.toolbar[type].data_api;
            var reg = new RegExp("(^https?:\/\/)", "i");
            if (data_api_url.search(reg) === -1) {
                return protocol + url + port + data_api_url + '?modulename=' + modulename + token;
            } else {
                return data_api_url + '?modulename=' + modulename + token;
            }
        }

        var buildFun = new Map([
            ['ws', () => {
                protocol = parseInt(KeFu.config.wss_switch) == 1 ? 'wss://' : 'ws://';

                return protocol + url + ':' + wsport + '?modulename=' +
                    modulename + token + kefu_tourists_token;
            }],
            ['initialize', () => {
                return protocol + url + port + '/addons/kefu/index/initialize?modulename=' +
                    modulename + '&referrer=' + document.referrer + kefu_tourists_token;
            }],
            ['upload', () => {
                return KeFu.config.upload.uploadurl + '?modulename=' + modulename + kefu_tourists_token;
            }],
            ['spark', () => {
                if (KeFu.config.__CDN__) {
                    return KeFu.config.__CDN__ + '/assets/addons/kefu/js/spark.js';
                }
                return protocol + url + port + '/assets/addons/kefu/js/spark.js';
            }],
            ['storage_notify', () => {
                return protocol + url + port + '/addons/' + modulename + '/index/notify';
            }],
            ['load_message_prompt', () => {
                if (KeFu.config.upload.cdnurl) {
                    return KeFu.config.upload.cdnurl + KeFu.config.ringing;
                }

                return protocol + url + port + '/addons/kefu/index/loadMessagePrompt?modulename=' +
                    modulename + kefu_tourists_token;
            }],
            ['pasteupload.js', () => {
                if (KeFu.config.__CDN__) {
                    return KeFu.config.__CDN__ + '/assets/addons/kefu/js/jquery.pasteupload.js';
                }
                return protocol + url + port + '/assets/addons/kefu/js/jquery.pasteupload.js';
            }],
            ['mobile', () => {
                return protocol + url + port + '/addons/kefu/index/mobile?fixed_csr=' + KeFu.fixed_csr;
            }],
            ['goods', goods_and_order],
            ['order', goods_and_order],
            ['default', () => {
                return protocol + url + port
            }]
        ]);

        let action = buildFun.get(type) || buildFun.get('default')
        return action.call(this);
    },
    edit_online_status: function (user_id, status) {

        var element = $("#session_panel [data-session_user='" + user_id + "']");

        if (status) {
            $(element).children(".person_avatar").removeClass("person_head_gray");
            element.children(".session_info_item").find(".session_user_status").eq(0).fadeOut();
        } else {
            $(element).children(".person_avatar").addClass("person_head_gray");
            element.children(".session_info_item").find(".session_user_status").eq(0).fadeIn();
        }
    },
    disableSelection: function (target) {

        if (typeof target.onselectstart != "undefined") {
            target.onselectstart = function () {
                return false
            };
        } else if (typeof target.style.MozUserSelect != "undefined") {
            target.style.MozUserSelect = "none";
        } else {
            target.Î¿nmÎ¿usedÎ¿wn = function () {
                return false;
            }
            target.style.cursor = "default";
        }

    },
    sendMessage: function (message, message_type) {

        // æ£€æŸ¥ websocket æ˜¯å¦è¿žæŽ¥
        if (!KeFu.ws.SocketTask || KeFu.ws.SocketTask.readyState != 1) {
            layer.msg('The network link is abnormal, please refresh and try again~');
            return;
        }

        if (typeof KeFu.session_id == 'string' && KeFu.session_id.indexOf('invitation') !== -1) {
            layer.msg('The visitor has not yet accepted the session request~');
            return;
        }

        if (!KeFu.session_id) {
            layer.msg('Please select a conversation~');
            return;
        }

        var message_id = new Date().getTime() + KeFu.session_id + Math.floor(Math.random() * 10000);
        var load_message = {
            c: 'Message',
            a: 'sendMessage',
            data: {
                message: message,
                message_type: message_type,
                session_id: KeFu.session_id,
                token: KeFu.token_list.kefu_token ? KeFu.token_list.kefu_token : '', // å‘æ¶ˆæ¯æ—¶æ£€æµ‹ç”¨æˆ·ç™»å½•æ€æ˜¯å¦è¿‡æœŸ
                modulename: KeFu.config.modulename,
                message_id: message_id
            }
        };

        KeFu.ws_send(load_message);

        var data = {
            sender: 'me',
            message: (message_type == 1 || message_type == 2) ? KeFu.config.upload.cdnurl + message : message,
            message_type: message_type
        }
        KeFu.buildRecord(data, 1, message_id);

        if (message_type == 1) {
            message = '[image]';
        } else if (message_type == 2) {
            message = '[link]';
        } else {
            message = message.replace(/<img(.*?)src=(.*?)>/g, "[image]");
            $('#kefu_message').html('');
        }

        if (KeFu.config.modulename == 'admin') {

            // ä¿®æ”¹è¯¥ä¼šè¯çš„æœ€åŽæ¶ˆæ¯
            let session = $("#session_panel [data-session='" + KeFu.session_id + "']");
            session.children(".session_info_item").children(".time").eq(0).html(KeFu.get_format_session_time());
            session.children(".session_info_item").find(".last_message").eq(0).html(message);

            // ç§»åŠ¨ä¼šè¯åˆ°ä¼šè¯ä¸­çš„ç¬¬ä¸€ä½
            let first_session = $('#session_list_dialogue li');
            if (first_session.length) {
                // åˆ†ç»„ä¸­å·²æœ‰å¯¹è¯
                first_session.eq(0).before(session);
            } else {
                // åˆ†ç»„ä¸­æ²¡æœ‰å¯¹è¯
                $('#session_list_dialogue').prepend(session);

                // æ¸…ç†æ²¡æœ‰ä¼šè¯çš„æç¤ºæ–‡å­—
                KeFu.group_session_is_none('dialogue');
            }

            // å±•å¼€åˆ†ç»„
            if (!KeFu.group_show.dialogue) {
                $('#heading_dialogue a').click();
            }

            if ($('#kefu_scroll').children('.status').children('span').eq(0).html() == 'No news yet') {
                $('#kefu_scroll').children('.status').children('span').eq(0).html(KeFu.get_format_session_time());
            }
        }

        $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);
    },
    playSound: function () {
        KeFu.audio.source = KeFu.audio.context.createBufferSource();
        KeFu.audio.source.buffer = KeFu.audio.buffer;
        KeFu.audio.source.loop = false;
        KeFu.audio.source.connect(KeFu.audio.context.destination);
        KeFu.audio.source.start(0); //ç«‹å³æ’­æ”¾
    },
    loadAudioFile: function (url) {
        var xhr = new XMLHttpRequest(); //é€šè¿‡XHRä¸‹è½½éŸ³é¢‘æ–‡ä»¶
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function (e) { //ä¸‹è½½å®Œæˆ

            KeFu.audio.context.decodeAudioData(this.response,
                function (buffer) { //è§£ç æˆåŠŸæ—¶çš„å›žè°ƒå‡½æ•°
                    KeFu.audio.buffer = buffer;
                    KeFu.playSound();
                },
                function (e) { //è§£ç å‡ºé”™æ—¶çš„å›žè°ƒå‡½æ•°
                    console.log('Audio decoding failed', e);
                });
        };
        xhr.send();
    },
    new_message_prompt: function (event) {

        if (KeFu.config.is_shake) {

            $(event).addClass('kefu-shake-horizontal');
            setTimeout(function () {
                $(event).removeClass('kefu-shake-horizontal');
            }, 400);
        }

        if (KeFu.audio.buffer) {
            KeFu.playSound();
        } else {
            let url = KeFu.buildUrl(KeFu.url, 'index', 'load_message_prompt');

            KeFu.loadAudioFile(url);
        }
    },
    kefu_blacklist: function (code, session_user, blacklist = null) {
        // ä¿®æ”¹ç”¨æˆ·é»‘åå•çŠ¶æ€
        // code:1=å±è”½æˆåŠŸ,2=è§£é™¤å±è”½æˆåŠŸ,3=é€šè¿‡ blacklist åˆ¤æ–­å±è”½çŠ¶æ€

        if (code == 3) {

            $('#kefu_blacklist').html(blacklist ? 'Cancel blackout' : 'add to blacklist');
            return;
        }

        if (session_user == KeFu.session_user) {
            if (code == 1) {
                $('#kefu_blacklist').html('Cancel blackout');
            } else if (code == 2) {
                $('#kefu_blacklist').html('add to blacklist');
            }
        }

    },
    // å¤„ç†åˆ†ç»„çš„æ²¡æœ‰ä¼šè¯æç¤º
    group_session_is_none: function (group) {
        var element_id = '#session_list_' + group;

        if ($(element_id + ' li').length) {
            $(element_id).children('.none_session').fadeOut();
        } else {
            $(element_id).children('.none_session').fadeIn();
            KeFu.session_group_red_dot(group, false);
        }
    },
    // ç§»åŠ¨å…‰æ ‡åˆ°æœ€æœª
    po_last: function () {
        var obj = $('#kefu_message')[0];
        if (window.getSelection) {//ie11 10 9 ff safari
            obj.focus(); //è§£å†³ffä¸èŽ·å–ç„¦ç‚¹æ— æ³•å®šä½é—®é¢˜
            var range = window.getSelection();//åˆ›å»ºrange
            range.selectAllChildren(obj);//range é€‰æ‹©objä¸‹æ‰€æœ‰å­å†…å®¹
            range.collapseToEnd();//å…‰æ ‡ç§»è‡³æœ€åŽ
        } else if (document.selection) {//ie10 9 8 7 6 5
            var range = document.selection.createRange();//åˆ›å»ºé€‰æ‹©å¯¹è±¡
            // var range = document.body.createTextRange();
            range.moveToElementText(obj);//rangeå®šä½åˆ°obj
            range.collapse(false);//å…‰æ ‡ç§»è‡³æœ€åŽ
            range.select();
        }
    },
    // å…‰æ ‡ä½ç½®æ’å…¥å…ƒç´ 
    insertToMessage: function (obj) {
        // èŽ·å–ç¼–è¾‘æ¡†å¯¹è±¡
        var Message = $('#kefu_message')[0]
        // ç¼–è¾‘æ¡†è®¾ç½®ç„¦ç‚¹
        Message.focus();
        // èŽ·å–é€‰å®šå¯¹è±¡
        var selection = getSelection()
        // åˆ¤æ–­æ˜¯å¦æœ‰æœ€åŽå…‰æ ‡å¯¹è±¡å­˜åœ¨

        // èŽ·å–åŒ…å«å½“å‰èŠ‚ç‚¹çš„æ–‡æ¡£ç‰‡æ®µ
        var range = selection.getRangeAt(0)

        // å°†åˆ›å»ºçš„æ–‡æ¡£ç‰‡æ®µæ’å…¥åˆ°å…‰æ ‡å¤„
        range.insertNode(obj)
        // å…‰æ ‡å¯¹è±¡çš„èŒƒå›´ç•Œå®šä¸ºæ–°å»ºçš„èŠ‚ç‚¹
        // range.selectNodeContents(obj)
        // å…‰æ ‡ä½ç½®å®šä½åœ¨èŠ‚ç‚¹çš„æœ€å¤§é•¿åº¦
        // range.setStart(obj, obj.length||1)
        // ä½¿å…‰æ ‡å¼€å§‹å’Œå…‰æ ‡ç»“æŸé‡å 
        range.collapse(false)
        // æ¸…é™¤é€‰å®šå¯¹è±¡çš„æ‰€æœ‰å…‰æ ‡å¯¹è±¡
        // selection.removeAllRanges()
        // æ’å…¥æ–°çš„å…‰æ ‡å¯¹è±¡
        // selection.addRange(range)
    },
    /*
    * éšè—èœå•å·¥å…·é¢æ¿
    */
    hide_tool_panel: function (show_id = '') {
        var tool_panel_action = {
            'none': () => {
                $('#kefu_link_form,#kefu_fast_reply_list,#kefu_emoji,#goods_select_model').hide();
            },
            'kefu_link_form': () => {
                $('#kefu_fast_reply_list,#kefu_emoji,#goods_select_model').hide();
            },
            'kefu_fast_reply_list': () => {
                $('#kefu_link_form,#kefu_emoji,#goods_select_model').hide();
            },
            'kefu_emoji': () => {
                $('#kefu_link_form,#kefu_fast_reply_list,#goods_select_model').hide();
            },
            'goods_select_model': () => {
                $('#kefu_link_form,#kefu_fast_reply_list,#kefu_emoji').hide();
            }
        }

        var action = tool_panel_action[show_id] || tool_panel_action['none'];
        action.call(this);
    },
    /*
    * ç»Ÿä¸€æ³¨å†Œäº‹ä»¶
    */
    eventReg: function () {

        // ç‚¹å‡»å•†å“æˆ–è®¢å•å¡ç‰‡å…³é—­ä¼šè¯çª—å£
        $(document).on('click', '.KeFu .chat .bubble .record_card', function () {
            if ($(this).parent().hasClass('btn-addtabs')) {
                $('#KeFuModal').modal('hide');
            }
        })

        // æäº¤ç•™è¨€
        $(document).on('click', '#kefu_leave_message form button', function (event) {

            var form_data = {};
            var t = $('#kefu_leave_message form').serializeArray();
            $.each(t, function () {
                form_data[this.name] = this.value;
            });

            if (!form_data['contact']) {
                layer.msg('Contact information cannot be empty~');
                return false;
            }

            var leave_message = {
                c: 'Message',
                a: 'leaveMessage',
                data: form_data
            };
            KeFu.ws_send(leave_message);
            return false;
        });

        // çª—å£å¤§å°å˜åŒ–æ—¶ï¼Œéšè—æŒ‰é’®æç¤º
        $(window).on('resize', function (e) {
            if (KeFu.resize_load <= 2) {
                $("#kefu_button").css({
                    "top": '80%',
                    "left": 'unset'
                });
                KeFu.toggle_popover('hide');
            }
            KeFu.resize_load += 1;
        });

        // ç”¨æˆ·åç‰‡ä¿å­˜æŒ‰é’®
        $(document).on('click', '#kefu_user_card form button', function (event) {

            if (!KeFu.session_user) {
                layer.msg('User can\'t find it~');
                return;
            }

            var form_data = {};
            var t = $('#kefu_user_card form').serializeArray();
            $.each(t, function () {
                form_data[this.name] = this.value;
            });

            let user_card_done = {
                c: 'Message',
                a: 'userCard',
                data: {
                    session_user: KeFu.session_user,
                    form_data: form_data,
                    action: 'done'
                }
            };
            KeFu.ws_send(user_card_done);
            return false;
        });

        // ç‚¹å‡»è½»æç¤ºå’ŒKeFuæ‚¬æµ®çƒçš„äº‹ä»¶
        $(document).on('click', '#kefu_button,.kefu_invite_box .consulting,.kefu_popover', function () {

            if (KeFu.config.modulename == 'admin' && $(this).hasClass('kefu_popover')) {
                // æ‰“å¼€æœ€åŽå‘é€æ¶ˆæ¯çš„ç”¨æˆ·çš„ä¼šè¯çª—å£
                if (KeFu.last_sender && parseInt(KeFu.last_sender) !== KeFu.session_id) {
                    KeFu.changeSession(KeFu.last_sender);
                }
            }

            if (!KeFu.clickkefu_button) {
                KeFu.toggle_window('show');
            }
        });

        $(document).on('click', '.bubble img', function (e) {

            var img_obj = $(e.target);
            if (img_obj.hasClass('emoji')) {
                return;
            }
            img_obj = img_obj[0];

            KeFu.allowed_close_window = false;// æŒ‰ä¸‹ecsä¸å…è®¸å…³é—­ä¼šè¯çª—å£

            layer.photos({
                photos: {
                    "title": "Chat picture preview",
                    "id": "record",
                    data: [
                        {
                            "src": img_obj.src
                        }
                    ]
                },
                end: function () {
                    // å›¾ç‰‡é¢„è§ˆå·²å…³é—­
                    KeFu.allowed_close_window = true;
                }, anim: 5 //0-6çš„é€‰æ‹©ï¼ŒæŒ‡å®šå¼¹å‡ºå›¾ç‰‡åŠ¨ç”»ç±»åž‹ï¼Œé»˜è®¤éšæœºï¼ˆè¯·æ³¨æ„ï¼Œ3.0ä¹‹å‰çš„ç‰ˆæœ¬ç”¨shiftå‚æ•°ï¼‰
            });

        });

        // æŒ‰é”®ç›‘å¬
        $(document).on('keyup', function (event) {

            // console.log('å½“å‰æŒ‰é’®çš„code:', event.keyCode);

            // å¯¹æ‰“å¼€ä¼šè¯çª—å£çš„ç›‘å¬
            // æ‰“å¼€ä¼šè¯çª—å£å¿«æ·é”®[ctrl + /],è‹¥éœ€ä¿®æ”¹ï¼Œè¯·æ‹¿åˆ°å¯¹åº”é”®çš„keyCodeæ›¿æ¢ä¸‹ä¸€è¡Œçš„191å³å¯ï¼Œ191ä»£è¡¨[/]é”®çš„keyCode
            if (event.keyCode == 191 && event.ctrlKey) {

                if (KeFu.last_sender) {
                    if (parseInt(KeFu.last_sender) === KeFu.session_id) {
                        // å±•å¼€åˆ†ç»„
                        if (!KeFu.group_show.dialogue) {
                            $('#heading_dialogue a').click();
                        }
                    }

                    KeFu.changeSession(KeFu.last_sender.toString());
                    KeFu.last_sender = null;
                } else if (KeFu.window_is_show) {
                    KeFu.toggle_window('hide');
                }

                // éœ€å…ˆåˆ‡æ¢ä¼šè¯å†æ‰“å¼€çª—å£
                if (!KeFu.window_is_show) {
                    KeFu.toggle_window('show');
                }
                return;
            }
            // å¯¹ecsé”®çš„ç›‘å¬
            else if (event.keyCode == 27 && KeFu.window_is_show) {
                if (parseInt(KeFu.config.ecs_exit) == 1 && KeFu.allowed_close_window) {
                    $('#KeFuModal').modal('hide');
                } else {
                    layer.closeAll();
                }
            }

        });

        // æ‹–åŠ¨æ‚¬æµ®çƒçš„äº‹ä»¶
        $(document).on('mousedown', '#kefu_button', function (e) {

            KeFu.toggle_popover('hide');
            KeFu.clickkefu_button = false;
            document.onselectstart = function () {
                return false;
            };//è§£å†³æ‹–åŠ¨ä¼šé€‰ä¸­æ–‡å­—çš„é—®é¢˜
            document.ondragstart = function () {
                return false;
            };
            $(document).find("iframe").css("pointer-events", "none");
            KeFu.fast_move = true;
            KeFu.fast_x = e.pageX - parseInt($("#kefu_button").css("left"));
            KeFu.fast_y = e.pageY - parseInt($("#kefu_button").css("top"));

            $(document).on('mousemove', function (e) {

                if (KeFu.fast_move) {

                    var x = e.pageX - KeFu.fast_x;
                    var y = e.pageY - KeFu.fast_y;

                    if (Math.abs(parseInt($("#kefu_button").css("left")) - x) + Math.abs(parseInt($("#kefu_button").css("top")) - y) > 7) {
                        KeFu.clickkefu_button = true;
                    }

                    // ä¿å­˜æŒ‰é’®ä½ç½®
                    var kefu_button_coordinate = [y, x];
                    localStorage.setItem("kefu_button_coordinate", kefu_button_coordinate);

                    $("#kefu_button").css({"top": y, "left": x});
                }

            }).mouseup(function () {
                document.onselectstart = null;
                document.ondragstart = null;
                $(document).find("iframe").css("pointer-events", "auto");
                KeFu.fast_move = false;
            });

        });

        // å±•å¼€åˆ†ç»„
        $(document).on('show.bs.collapse', '.dialogue_panel,.invitation_panel,.recently_panel', function (e) {

            if ($(e.currentTarget).hasClass('dialogue_panel')) {

                KeFu.group_show.dialogue = true;
                KeFu.session_group_red_dot('dialogue', false);

                $('.dialogue_panel').on('hide.bs.collapse', function () {
                    KeFu.group_show.dialogue = false;
                });
            } else if ($(e.currentTarget).hasClass('invitation_panel')) {

                KeFu.group_show.invitation = true;
                KeFu.session_group_red_dot('invitation', false);

                $('.invitation_panel').on('hide.bs.collapse', function () {
                    KeFu.group_show.invitation = false;
                });
            } else if ($(e.currentTarget).hasClass('recently_panel')) {
                KeFu.group_show.recently = true;
                KeFu.session_group_red_dot('recently', false);

                $('.recently_panel').on('hide.bs.collapse', function () {
                    KeFu.group_show.recently = false;
                });
            }

        });

        // å®¢æœä»£è¡¨æ”¹å˜çŠ¶æ€
        $(document).on('click', '#kefu_csr_status ul li', function (e) {

            var load_message = {
                c: 'Message',
                a: 'csrChangeStatus',
                data: {
                    status: $(e.target).data('status')
                }
            };
            KeFu.ws_send(load_message);

        });

        // éšè—çª—å£æ—¶
        $(document).on('hidden.bs.modal', '#KeFuModal', function (e) {
            $('#kefu_button').fadeIn();
            KeFu.window_is_show = false;
        });

        // æ˜¾ç¤ºçª—å£æ—¶
        $(document).on('shown.bs.modal', '#KeFuModal', function (e) {
            KeFu.window_is_show = true;
            $('#kefu_scroll').scrollTop($('#kefu_scroll')[0].scrollHeight);

            if (!localStorage.getItem('kefu_new_user')) {
                localStorage.setItem('kefu_new_user', true);
            }

            if (typeof KeFu.window_show_event == 'function') {
                KeFu.window_show_event();
                KeFu.window_show_event = null;
            }

        });

        // æ˜¾ç¤ºå•†å“å’Œè®¢å•é€‰æ‹©é¢æ¿
        $(document).on('click', '.write_top .goods,.write_top .order', function (e) {
            var panel_name = $(e.target).hasClass('goods') ? 'goods' : 'order';
            KeFu.hide_tool_panel('goods_select_model');

            if ($('#goods_select_model').css('display') == 'block') {
                $('#goods_select_model').fadeOut();
                return;
            } else {
                $('#goods_select_model').fadeIn();
            }

            var api_url = KeFu.buildUrl(KeFu.url, 'index', panel_name);
            var index = layer.load(0, {shade: false});
            $.ajax(api_url, {
                success: res => {
                    if (res.code == 1) {
                        $('#goods_select_model .project_list').html('');
                        for (let i in res.data) {

                            var input_value = '';
                            for (let y in res.data[i]) {
                                input_value += y + '=' + res.data[i][y] + '#';
                            }

                            let project_item = '<label class="record_card">\n' +
                                '<img src="' + res.data[i].image + '" />\n' +
                                '<div class="record_card_body">\n' +
                                '   <div class="record_card_title">' + res.data[i].subject + '</div>\n' +
                                (res.data[i].note ? '<div class="record_card_note">' + res.data[i].note + '</div>\n' : '') +
                                '   <div class="record_card_price">\n' +
                                (res.data[i].price ? '<span>' + res.data[i].price + '</span>\n' : '') +
                                (res.data[i].number ? '<span>x' + res.data[i].number + '</span>\n' : '') +
                                '   </div>\n' +
                                '</div>\n' +
                                '<input name="' + panel_name + '" type="radio" value="' + input_value + '" />\n' +
                                '</label>';
                            $('#goods_select_model .project_list').append(project_item);
                        }
                    } else {
                        layer.msg(res.msg)
                    }
                },
                error: res => {
                    layer.msg('Loading failed, please try again~');
                },
                complete: res => {
                    layer.close(index)
                }
            });
        });

        // é€‰æ‹©è®¢å•æˆ–å•†å“
        $(document).on('click', '.KeFu .modal-body #goods_select_model input', function (e) {
            KeFu.sendMessage($(e.target).val(), (e.target.name == 'goods') ? 4 : 5);
            $('#goods_select_model').hide();
            KeFu.po_last();
        })

        // æ˜¾ç¤ºè¡¨æƒ…é€‰æ‹©é¢æ¿
        $(document).on('click', '.write_top .smiley', function (e) {
            KeFu.hide_tool_panel('kefu_emoji');
            $('#kefu_emoji').fadeToggle();
            // èŽ·å–ç„¦ç‚¹
            KeFu.po_last();
        });

        // æ˜¾ç¤ºè¾“å…¥é“¾æŽ¥é¢æ¿
        $(document).on('click', '.write_top .link,#kefu_link_form .btn-default', function (e) {
            KeFu.hide_tool_panel('kefu_link_form');
            $('#kefu_link_form').fadeToggle();
            $('#kefu_link_form_url').focus().select();
        });

        // ç¡®è®¤é“¾æŽ¥
        $(document).on('click', '#kefu_link_form .btn-success', function (e) {
            var kefu_link_form_ins = $('#kefu_link_form_ins').val()
            var kefu_link_form_url = $('#kefu_link_form_url').val()
            kefu_link_form_ins = kefu_link_form_ins ? kefu_link_form_ins : kefu_link_form_url;

            $('#kefu_link_form').fadeOut();
            $('#kefu_message').append(KeFu.buildChatA(kefu_link_form_url, kefu_link_form_ins, 'link'));
            KeFu.po_last();
        });

        // é€‰æ‹©è¡¨æƒ…
        $(document).on('click', '#kefu_emoji img', function (e) {
            $('#kefu_message').append($(e.target).clone());
            $('#kefu_emoji').fadeOut();
            KeFu.po_last()
        });

        // ç”¨æˆ·ç‚¹å‡»èŠå¤©è®°å½•çª—å£ï¼Œéšè—æ‰€æœ‰å·¥å…·é¢æ¿
        $(document).on('click', '#kefu_scroll', function () {
            KeFu.hide_tool_panel();
        });

        // ç”¨æˆ·é€‰æ‹©äº†æ–‡ä»¶
        $(document).on('change', '#chatfile', function (e) {
            var file = $('#chatfile')[0].files[0];

            if (!file) {
                return;
            }

            KeFu.hide_tool_panel();

            // ä¸Šä¼ æ–‡ä»¶
            var formData = new FormData();
            formData.append("file", file);
            if (KeFu.config.upload.multipart) {
                for (let i in KeFu.config.upload.multipart) {
                    formData.append(i, KeFu.config.upload.multipart[i]);
                }
            }

            $.ajax({
                url: KeFu.config.upload.uploadurl,
                type: 'post',
                data: formData,
                contentType: false,
                processData: false,
                success: function (res) {
                    if (res.code == 1) {

                        // å‘é€notifyè¯·æ±‚
                        if (KeFu.config.upload.storage != 'local') {
                            KeFu.getFileMd5(file, function (md5) {
                                var ajax_data = {
                                    size: file.size,
                                    name: file.name,
                                    md5: md5,
                                    type: file.type,
                                    url: res.data.url
                                };

                                for (let i in KeFu.config.upload.multipart) {
                                    ajax_data[i] = KeFu.config.upload.multipart[i];
                                }

                                $.ajax({
                                    url: KeFu.buildUrl(KeFu.url, KeFu.config.upload.storage, 'storage_notify'),
                                    type: 'POST',
                                    data: ajax_data
                                });
                            })
                        }

                        var file_name = res.data.url.split('.');
                        var file_suffix = file_name[file_name.length - 1];

                        if (file_suffix == 'png' ||
                            file_suffix == 'jpg' ||
                            file_suffix == 'gif' ||
                            file_suffix == 'jpeg') {

                            KeFu.sendMessage(res.data.url, 1);
                        } else {
                            KeFu.sendMessage(res.data.url, 2);
                        }
                    } else {
                        layer.msg(res.msg);
                    }
                },
                error: function (e) {
                    layer.msg('File upload failed, please try againï¼');
                },
                complete: function () {
                    $('#chatfile').val('');
                }
            })
        });

        // ç¦æ­¢å›žè½¦é”®æ¢è¡Œ
        $(document).on('keypress', '#kefu_message', function (event) {
            if (parseInt(KeFu.config.send_message_key) == 1 && event.keyCode == "13" && !event.ctrlKey) {
                event.preventDefault()
            }
        });

        if (KeFu.browserType() == "FF") {

            // è¿‡æ»¤è¾“å…¥æ¡†ä¸­çš„htmlæ ‡ç­¾
            $(document).on('paste', '#kefu_message', function (e) {
                setTimeout(function () {
                    var message = $(e.target).html();
                    $(e.target).html(message.replace("/<(?!img|div).*?>/g", ''));
                    KeFu.po_last();
                }, 100);
            });
        }

        // æŒ‰é”®å‘é€æ¶ˆæ¯ç›‘å¬
        $(document).on('keyup', '#kefu_message', function (event) {

            var message = $(event.currentTarget).html();

            if (parseInt(KeFu.config.send_message_key) == 1 && event.keyCode == "13" && !event.ctrlKey) {
                if (message) {
                    KeFu.sendMessage(message, 0);
                }
            } else if (parseInt(KeFu.config.send_message_key) == 0 && event.keyCode == "13" && event.ctrlKey) {
                if (message) {
                    KeFu.sendMessage(message, 0);
                }
            } else if (parseInt(KeFu.config.send_message_key) == 1 && event.keyCode == "13" && event.ctrlKey) {

                // Enterå‘é€æ¶ˆæ¯æ—¶ï¼Œç”¨æˆ·æŒ‰ä¸‹äº†ctrl+Enter
                if (KeFu.browserType() == "IE" || KeFu.browserType() == "Edge") {
                    $(event.currentTarget).html(message + "<div></div>");
                } else if (KeFu.browserType() == "FF") {
                    $(event.currentTarget).html(message + "<br/><br/>");
                } else {
                    $(event.currentTarget).html(message + "<div><br/></div>");
                }

                // èŽ·å¾—ç„¦ç‚¹-å…‰æ ‡æŒªåˆ°æœ€åŽ
                KeFu.po_last()
            }

            event.preventDefault()
        });

        // åˆ‡æ¢ä¼šè¯
        $(document).on('click', '#session_panel li,#session_list_search li', function (e) {

            if ($('.KeFu .modal-body .kefu-right').css('display') == 'none') {
                $('.KeFu .modal-body .kefu-right').fadeIn();
                $('.KeFu .modal-body .kefu-left').fadeOut();
            }

            KeFu.changeSession($(e.currentTarget).data('session'));

            if ($(e.currentTarget).data('group') == 'search') {
                $('#session_list_search').fadeOut();
            }
        });

        // æ‰‹æœºç‰ˆèŠå¤©çª—å£å…¼å®¹
        $(document).on('hide.bs.modal', '#KeFuModal', function (e) {
            if ($('.KeFu .modal-body .kefu-left').css('display') == 'none') {
                $('.KeFu .modal-body .kefu-left').fadeIn();
                $('.KeFu .modal-body .kefu-right').fadeOut();
                return false;
            }
        });

        // æ˜¾ç¤ºè½¨è¿¹
        $(document).on('click', '#kefu_view_trajectory', function (e) {
            if (!KeFu.session_id) {
                layer.msg('Please select a session~');
                return;
            }
            KeFu.changeSession(KeFu.session_id, 'trajectory');
        });

        // æ˜¾ç¤ºç”¨æˆ·åç‰‡
        $(document).on('click', '#kefu_view_user_card', function (e) {

            if (!KeFu.session_user) {
                layer.msg('Please select a session~');
                return;
            }

            // åŠ è½½ç”¨æˆ·åç‰‡
            KeFu.toggle_window_view('kefu_user_card');

            var kefu_blacklist = {
                c: 'Message',
                a: 'userCard',
                data: {
                    session_user: KeFu.session_user
                }
            };
            KeFu.ws_send(kefu_blacklist);

        });

        // æ‹‰é»‘åå•
        $(document).on('click', '#kefu_blacklist', function () {
            if (!KeFu.session_user) {
                layer.msg('Please select a session~');
                return;
            }
            var kefu_blacklist = {
                c: 'Message',
                a: 'blacklist',
                data: {
                    session_user: KeFu.session_user
                }
            };
            KeFu.ws_send(kefu_blacklist);
        });

        // åŠ è½½æ›´å¤šèŠå¤©è®°å½•å’Œè½¨è¿¹
        document.addEventListener('scroll', function (event) {

            if ($(event.target).scrollTop() == 0 && KeFu.chat_record_page != 'done') {
                if (event.target.id == 'kefu_scroll') {

                    if (!KeFu.session_id) {
                        return;
                    }

                    // åŠ è½½åŽ†å²èŠå¤©è®°å½•
                    var load_message = {
                        c: 'Message',
                        a: 'chatRecord',
                        data: {
                            session_id: KeFu.session_id,
                            page: KeFu.chat_record_page
                        }
                    };
                    KeFu.record_scroll_height = $('#kefu_scroll')[0].scrollHeight;

                    KeFu.ws_send(load_message);
                } else if (event.target.id == 'kefu_trajectory') {

                    if (!KeFu.session_user) {
                        return;
                    }

                    // åŠ è½½è½¨è¿¹è®°å½•
                    var load_log = {
                        c: 'Message',
                        a: 'trajectory',
                        data: {
                            session_user: KeFu.session_user,
                            page: KeFu.chat_record_page
                        }
                    };
                    KeFu.record_scroll_height = $('#kefu_trajectory')[0].scrollHeight;

                    KeFu.ws_send(load_log);
                }
            }

        }, true);

        // å³é”®èœå•
        $(document).on('contextmenu', '.person', function (e) {

            KeFu.select_session_user = $(e.currentTarget).data('session_user');

            var popupmenu = $('#kefu_menu');
            popupmenu.fadeOut();
            $('.kefu_edit_user_nickname').remove();
            $('.kefu_transfer_session').remove();

            let l = ($(document).width() - e.clientX) < popupmenu.width() ? (e.clientX - popupmenu.width()) : e.clientX;
            let t = ($(document).height() - e.clientY) < popupmenu.height() ? (e.clientY - popupmenu.height()) : e.clientY;
            popupmenu.css({left: l, top: t}).fadeIn();

            if ($(e.currentTarget).data('group') == 'invitation') {
                $('#kefu_menu .invitation').fadeIn();
                $('#kefu_menu .transfer').fadeOut();
            } else {
                $('#kefu_menu .invitation').fadeOut();
                $('#kefu_menu .transfer').fadeIn();
            }

            e.preventDefault();
        }).click(function () {
            // èœå•çš„éšè—
            $('#kefu_menu').fadeOut();
        });

        // ä¼šè¯å³é”®èœå• åˆ é™¤ä¼šè¯ & é‚€è¯·å¯¹è¯ & è½¬æŽ¥ä¼šè¯ & ä¿®æ”¹æ˜µç§°
        $(document).on('click', '.kefu_menu_item', function (e) {
            var action = $(e.currentTarget).data('action');

            if (KeFu.select_session_user) {

                if (action == 'del') {
                    $("#session_panel [data-session_user='" + KeFu.select_session_user + "']").remove();
                }

                if (action == 'edit_nickname') {

                    var session = $("#session_panel [data-session_user='" + KeFu.select_session_user + "']");
                    var nickname = session.children(".session_info_item").children(".name").eq(0).html();

                    // æ˜¾ç¤ºä¿®æ”¹æ˜µç§°çš„æ“ä½œé¢æ¿
                    var tpl = '\
                    <div class="kefu_edit_user_nickname" data-edit_nickname_user="' + KeFu.select_session_user + '">\
                        <div class="form-group">\
                            <label>Modify tourist nickname</label>\
                            <input type="text" id="new_nickname" class="form-control" value="' + nickname + '" />\
                            <div class="transfer_session_buttons">\
                                <button type="button" id="edit_user_nickname_cancel" class="btn btn-default btn-sm">cancel</button>\
                                <button type="button" id="edit_user_nickname_ok" class="btn btn-success btn-sm">confirm</button>\
                            </div>\
                        </div>\
                    </div>';

                    session.after(tpl);

                    $(document).on('click', '#edit_user_nickname_cancel', function (e) {
                        $('.kefu_edit_user_nickname').remove();
                    });

                    $(document).on('click', '#edit_user_nickname_ok', function (e) {

                        var edit_nickname_user = $('.kefu_edit_user_nickname').data('edit_nickname_user');
                        var new_nickname = $('#new_nickname').val();

                        if (edit_nickname_user && new_nickname) {
                            var action_session = {
                                c: 'Message',
                                a: 'actionSession',
                                data: {
                                    action: 'edit_nickname',
                                    session_user: edit_nickname_user,
                                    new_nickname: new_nickname
                                }
                            };
                            KeFu.ws_send(action_session);
                        }

                        $('.kefu_edit_user_nickname').remove();
                    });
                    return;
                }

                var action_session = {
                    c: 'Message',
                    a: 'actionSession',
                    data: {
                        action: action,
                        session_user: KeFu.select_session_user
                    }
                };
                KeFu.ws_send(action_session);

            } else {
                layer.msg('No conversation found~');
            }
        });

        // æœç´¢ä¼šè¯
        $(document).on('keyup', '#kefu_search_input', function (event) {

            if (KeFu.config.modulename != 'admin') {
                return;
            }

            if (event.keyCode == "13") {

                var search_key = $('#kefu_search_input').val();

                if (search_key.length <= 0) {

                    // æ— æœç´¢è¯ï¼Œä¸”é¢„é€‰æ¡†å·²æ˜¾ç¤ºï¼Œéšè—é¢„é€‰æ¡†
                    if ($('#session_list_search').css('display') != 'none') {
                        $('#session_list_search').fadeOut();
                        KeFu.search_select_id = '';
                    } else {
                        layer.msg('Please enter the user to findï¼');
                    }

                    return;
                } else {

                    // æœ‰é¢„é€‰äºº,é€‰ä¸­è¯¥ä¼šè¯
                    if ($('#session_list_search').css('display') != 'none' && KeFu.search_select_id) {
                        KeFu.changeSession(KeFu.search_select_id);
                        $('#session_list_search').fadeOut();
                        KeFu.search_select_id = '';
                        return;
                    }
                }

                var load_message = {
                    c: 'Message',
                    a: 'searchUser',
                    data: search_key
                };

                KeFu.ws_send(load_message);
            } else if (event.keyCode == '38') {
                KeFu.search_primary--;
                KeFu.setSelectedItem();
            } else if (event.keyCode == '40') {
                KeFu.search_primary++;
                KeFu.setSelectedItem();
            }

            event.preventDefault();

            // æœç´¢æ¡†å¤±åŽ»ç„¦ç‚¹
            $(document).on('blur', '#kefu_search_input', function () {
                setTimeout(function () {
                    // ç­‰å¾…ç‚¹å‡»äº‹ä»¶å†’æ³¡-é˜²æ­¢æœç´¢ç»“æžœä¸­çš„è“è‰²èŠå¤©æ–‡å­—ä¸èƒ½è¢«ç‚¹å‡»
                    $('#session_list_search').fadeOut();
                    KeFu.search_select_id = 0;
                }, 250);
            });
        });

        /*å¿«æ·å›žå¤é¢æ¿*/
        $(document).on('click', '.kefu_fast_reply', function () {
            KeFu.hide_tool_panel('kefu_fast_reply_list');
            $('#kefu_fast_reply_list').fadeToggle();
        });

        /*é€‰æ‹©å¿«æ·å›žå¤*/
        $(document).on('click', '.kefu_fast_reply_list tr', function (e) {
            var reply_id = $(e.currentTarget).data('id');
            var content = KeFu.fast_reply[reply_id].content;
            KeFu.sendMessage(content, 0);
            KeFu.po_last();
            $('#kefu_fast_reply_list').fadeOut();
        });

        KeFu.messageInputEventReg();
    },
    messageInputEventReg: function () {

        var input_status_display = parseInt(KeFu.config.input_status_display);
        if (input_status_display == 0) {
            return;
        } else if (input_status_display == 2 && KeFu.config.modulename != 'index') {
            return;
        }

        $(document).on('input', '#kefu_message', function (e) {
            var kefu_message_input = {
                c: 'Message',
                a: 'messageInput',
                data: {
                    session_id: KeFu.session_id,
                    session_user: KeFu.csr || KeFu.session_user,
                    type: 'input'
                }
            };
            KeFu.ws_send(kefu_message_input);
        });

        $(document).on('blur', '#kefu_message', function (e) {
            var kefu_message_input = {
                c: 'Message',
                a: 'messageInput',
                data: {
                    session_id: KeFu.session_id,
                    session_user: KeFu.csr || KeFu.session_user,
                    type: 'blur'
                }
            };
            KeFu.ws_send(kefu_message_input);
        });
    },
    setSelectedItem: function () {

        if (KeFu.search_primary < 0) {
            KeFu.search_primary = $('#session_list_search').find('li').length - 1;
        } else if (KeFu.search_primary > $('#session_list_search').find('li').length - 1) {
            KeFu.search_primary = 0;
        }

        $('#session_list_search').find('li').removeClass('select_item')
        .eq(KeFu.search_primary).addClass('select_item');

        // å°†é¢„é€‰è¯æ”¾å…¥è¾“å…¥æ¡†
        $('#kefu_search_input').val($('#session_list_search').find('li').eq(KeFu.search_primary).data('nickname'));
        KeFu.search_select_id = $('#session_list_search').find('li').eq(KeFu.search_primary).data('session');
    },
    browserType: function () {
        var userAgent = navigator.userAgent; //å–å¾—æµè§ˆå™¨çš„userAgentå­—ç¬¦ä¸²
        var isOpera = false;
        if (userAgent.indexOf('Edge') > -1) {
            return "Edge";
        }
        if (userAgent.indexOf('.NET') > -1) {
            return "IE";
        }
        if (userAgent.indexOf("Opera") > -1 || userAgent.indexOf("OPR") > -1) {
            isOpera = true;
            return "Opera"
        }
        ; //åˆ¤æ–­æ˜¯å¦Operaæµè§ˆå™¨
        if (userAgent.indexOf("Firefox") > -1) {
            return "FF";
        } //åˆ¤æ–­æ˜¯å¦Firefoxæµè§ˆå™¨
        if (userAgent.indexOf("Chrome") > -1) {
            return "Chrome";
        }
        if (userAgent.indexOf("Safari") > -1) {
            return "Safari";
        } //åˆ¤æ–­æ˜¯å¦Safariæµè§ˆå™¨
        if (userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") > -1 && !isOpera) {
            return "IE";
        }
        ; //åˆ¤æ–­æ˜¯å¦IEæµè§ˆå™¨
    },
    isPc: function () {
        var is_touch = !!("ontouchstart" in window);
        if (!is_touch) {
            return true;
        }
        var userAgentInfo = navigator.userAgent;
        var Agents = [
            "Android",
            "iPhone",
            "SymbianOS",
            "Windows Phone",
            "iPad",
            "iPod"
        ];
        var flag = true;
        for (var v = 0; v < Agents.length; v++) {
            if (userAgentInfo.indexOf(Agents[v]) > 0) {
                flag = false;
                break;
            }
        }
        return flag;
    }
}