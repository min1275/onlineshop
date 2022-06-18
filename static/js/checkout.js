$(function (){
    var IMP = window.IMP; //iamport 메뉴얼 참고
    IMP.init('imp48841201'); //iamport 관리자 페이지에 있는 가맹정 식별코드를 입력해야한다.

    $('.order-form').on('submit', function (e) { //order_form에 submit 버튼을 눌렀을 떄 function을 동작시킨다
        var amount = parseFloat($('.order-form input[name="amount"]').val().replace(',','')); //결제금액
        var type = $('.order-form input[name="type"]:checked').val(); //결제 타입 결정

        // debug message 추가하기
        var msg = 'checkout.js --- (1) : submit 버튼 클릭됨.';
        console.log(msg);

        // 폼 데이터를 기준으로 주문 생성
        var order_id = AjaxCreateOrder(e); // 결제하기 누르면 주문이 생성

        if (order_id ==false){ //주문이 제대로 생성되지 않음
            alert('주문 생성 실패\n다시 시도해주세요.')
            return false; //form이 동작하지 않음
        }
        //결제 정보 생성
        var merchant_id = AjaxStoreTransaction(e, order_id, amount, type);

        //결제 정보가 만들어졌으면, iamport로 실제 결제 시도
        if (merchant_id !== ''){ // !== : type까지 같은지 체크

            IMP.request_pay({ //결제 요청 부분, iamport 메뉴얼에서 정의해준 포맷
                merchant_uid : merchant_id,
                name : 'E-Shop product', //임의의 이름
                buyer_name:$('input[name="first_name"]').val()+" "+$('input[name="last_name"]').val(),
                buyer_email:$('input[name="email"]').val(),
                amount : amount
            }, function (rsp){ //결제 완료 후 처리
                if (rsp.success){
                    var msg = '결제가 완료되었습니다.';
                    msg += '고유ID : ' + rsp.imp_uid;
                    msg += '상점 거래ID : ' + rsp.merchant_uid;
                    msg += '결제 금액 : ' + rsp.paid_amount;
                    msg += '카드 승인번호 : ' + rsp.apply_num;

                    //결제가 완료되었으면, 비교해서 DB 반영
                    ImpTransaction(e, order_id, rsp.merchant_uid, rsp.imp_uid, rsp.paid_amount);

                } else {
                    var msg = '결제에 실패하였습니다.';
                    msg += '에러내용 : ' +rsp.error_msg;
                    console.log(msg);
                }
            });
        }
        return false;
    });
});

function AjaxCreateOrder(e){
    e.preventDefault(); //form이 submit되는 것을 막아준다.
    var order_id = '';

    var request = $.ajax({
        method:"POST",
        url: order_create_url, //order 생성 뷰 호출, templates에 준비해둔 url임
        async: false, //동기 과정으로 진행하여 하나의 일이 끝나고 다음 일 수행
        data: $('.order-form').serialize() //serialize()를 통해 form의객체들을 한번에 가져온다
    });

    //응답 오면 처리하는 부분
    request.done(function (data){
        if (data.order_id) {
            order_id = data.order_id;
        }
    });

    //응답이 왔는데 문제가 있을 떄 처리
    request.fail(function (jqXHR, textStatus){
        if(jqXHR.status==404){
            alert("페이지가 존재하지 않습니다.");
        }else if(jqXHR.status==403){
           alert("로그인 해주세요.");
        }else {
            alert("문제가 발생했습니다. 다시 시도해주세요.");
        }
    });
    return order_id;
}

function AjaxStoreTransaction(e, order_id,amount, type){
    e.preventDefault();
    var merchant_id = '';
    var request = $.ajax({
        method: "POST",
        url: order_checkout_url, // OrderCheckoutAjaxView 호출
        async: false,
        data: {
            order_id : order_id,
            amount: amount,
            type: type,
            csrfmiddlewaretoken: csrf_token, //create.html에 정의된다.
        }
    });

     request.done(function (data){
        if (data.works){
            merchant_id = data.merchant_id;
        }
    });

    request.fail(function (jqXHR, textStatus){
        if(jqXHR.status==404){
            alert("페이지가 존재하지 않습니다.");
        }else if(jqXHR.status==403){
           alert("로그인 해주세요.");
        }else {
            alert("문제가 발생했습니다. 다시 시도해주세요.");
        }
    });
    return merchant_id;
}

function ImpTransaction(e, order_id, merchant_id, imp_id, amount){
    e.preventDefault();
    var request = $.ajax({
        method: "POST",
        url: order_validation_url,
        async: false,
        data: {
            order_id : order_id,
            merchant_id:merchant_id,
            imp_id:imp_id,
            amount:amount,
            csrfmiddlewaretoken: csrf_token
        }
    });

     request.done(function (data){
        if (data.works){ //페이지 이동
           $(location).attr('href', location.origin+order_complete_url+'?order_id='+order_id)
        }
    });

    request.fail(function (jqXHR, textStatus){
        if(jqXHR.status==404){
            alert("페이지가 존재하지 않습니다.");
        }else if(jqXHR.status==403){
           alert("로그인 해주세요.");
        }else {
           alert("문제가 발생했습니다. 다시 시도해주세요.");
        }
    });
}