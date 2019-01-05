# This file contains list cron jobs

echo "$(echo '*/15 * * * *' $NODE_PATH $TEAMS_CONTROL_CRON_SCRIPT_PATH ; crontab -l)" | crontab -
echo "$(echo '* * * * * '$NODE_PATH $SEQUENCE_MESSAGE_CRON_SCRIPT_PATH ; crontab -l)" | crontab -
echo "$(echo '1 0 14 * * '$NODE_PATH $UPDATE_PROFILE_PIC_CRON_SCRIPT_PATH ; crontab -l)" | crontab -
