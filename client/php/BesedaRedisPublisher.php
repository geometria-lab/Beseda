<?php

if (!class_exists('Rediska')) {
    throw new Exception('You must require Rediska (http://rediska.geometria-lab.net) redis client before.');
}

/**
 * @author Ivan Shumkov
 */
class BesedaRedisPublisher
{
    /**
     * Rediska instance
     *
     * @var Rediska
     */
    protected $_rediska;

    /**
     * Client ID
     *
     * @var string
     */
    protected $_clientId;

    public function __construct($rediska)
    {
        $this->setRediska($rediska);

        $this->_clientId = BesedaRedisPublisher::uid();
    }

    public function publish($channel, $message)
    {
        if (strpos($channel, '/') !== 0) {
            throw new Exception('Channel must be start with /');
        }

        $message = array(
            'id'       => BesedaRedisPublisher::uid(),
            'channel'  => $channel,
            'clientId' => $this->_clientId,
            'data'     => $message
        );

        $this->_rediska->publish($channel, json_encode($message));
    }

    public function setRediska(Rediska $rediska)
    {
        $this->_rediska = Rediska_Options_RediskaInstance::getRediskaInstance($rediska, 'Exception', 'options');

        return $this;
    }

    public function getRediska()
    {
        return $this->_rediska;
    }

    static $_base64chars = array('0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F',
                                 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V',
                                 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l',
                                 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z', '-', '_');

    static public function uid()
    {
        $uid = '';

        for ($i = 0; $i < 22; $i++) {
            $uid .= self::$_base64chars[mt_rand(0, 63)];
        }

        return $uid;
    }
}