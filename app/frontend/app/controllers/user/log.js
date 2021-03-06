import Controller from '@ember/controller';
import { later as runLater } from '@ember/runloop';
import $ from 'jquery';
import i18n from '../../utils/i18n';
import modal from '../../utils/modal';
import capabilities from '../../utils/capabilities';
import CoughDrop from '../../app';
import app_state from '../../utils/app_state';
import evaluation from '../../utils/eval';
import { observer } from '@ember/object';
import { computed } from '@ember/object';

export default Controller.extend({
  title: computed('model.user_name', function() {
    return "Log Details";
  }),
  draw_charts: observer('model.geo', 'user', function() {
    if(!this.get('model.geo')) {
      return;
    }
    var user = this.get('user');
    var elem = document.getElementsByClassName('geo_map')[0];
    var geo = this.get('model.geo');
    if(user && user.get('preferences.geo_logging') && geo) {
        CoughDrop.Visualizations.wait('geo', function() {
          if(elem && geo) {
            var current_info = null;
            if(elem) {
              var map = new window.google.maps.Map(elem, {
                scrollwheel: false,
                maxZoom: 16
              });
              var markers = [];
              var locations = [geo];
              locations.forEach(function(location) {
                var title = i18n.t('session_count', "session", {count: location.total_sessions});
                var marker = new window.google.maps.Marker({
                  position: new window.google.maps.LatLng(location.latitude, location.longitude),
                  // TODO: https://developers.google.com/maps/documentation/javascript/examples/marker-animations-iteration
                  // animation: window.google.maps.Animation.DROP,
                  title: title
                });
                // TODO: popup information for each location
                marker.setMap(map);
                markers.push(marker);
              });
              var bounds = new window.google.maps.LatLngBounds();
              for(var i=0;i<markers.length;i++) {
               bounds.extend(markers[i].getPosition());
              }
              map.fitBounds(bounds);
            }
          }
        });
    }
  }),
  processed_assessment: computed(
    'model.type',
    'model.eval_in_memory',
    'model.evaluation',
    'user.id',
    function() {
      if(this.get('model.type') == 'eval') {
        var assessment = this.get('model.evaluation');
        if(this.get('model.eval_in_memory')) {
          assessment = app_state.get('last_assessment_for_' + this.get('user.id')) || {};
        }
        window.current_assesment = assessment;
        return evaluation.analyze(assessment);
      }
    }
  ),
  same_author: computed('model.author.id', 'app_state.sessionUser.id', function() {
    return this.get('model.author.id') == app_state.get('sessionUser.id');
  }),
  actions: {
    reply: function() {
      var _this = this;
      var user = _this.get('user');
      modal.open('record-note', {note_type: 'text', user: user, prior: _this.get('model')});
    },
    print: function() {
      capabilities.print();

    },
    lam_export: function() {
      capabilities.window_open('/api/v1/logs/' + this.get('model.id') + '/lam?nonce=' + this.get('model.nonce'), '_system');
    },
    obl_export: function() {
      modal.open('download-log', {log: this.get('model')});
    },
    toggle_notes: function(id, action) {
      this.get('model').toggle_notes(id);
      if(action == 'add') {
        runLater(function() {
          $("input[data-event_id='" + id + "']").focus().select();
        }, 200);
      }
    },
    add_note: function(event_id) {
      var val = $("input[data-event_id='" + event_id + "']").val();
      if(val) {
        this.get('model').add_note(event_id, val);
      }
      $("input[data-event_id='" + event_id + "']").val("");
    },
    resume: function() {
      var assessment = this.get('model.evaluation');
      if(this.get('model.eval_in_memory')) {
        assessment = app_state.get('last_assessment_for_' + this.get('user.id')) || {};
        // TODO: how to get log_session_id for in-memory evaluation
        assessment.log_session_id;
      } else {
        assessment.log_session_id = this.get('model.id');
      }
      evaluation.resume(assessment);
    },
    highlight: function(event_id, do_highlight) {
        this.get('model').highlight(event_id, !!do_highlight);
    },
    draw_charts: function() {
      this.draw_charts();
    },
    mastery_preview: function() {
      this.set('mastery_preview', !this.get('mastery_preview'));
    }
  }
});
